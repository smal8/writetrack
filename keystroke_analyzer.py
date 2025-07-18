import numpy as np
import pandas as pd
import re
from datetime import datetime
from typing import List, Dict, Any
from collections import Counter
from scipy.stats import skew, kurtosis
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.decomposition import LatentDirichletAllocation, PCA
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

class KeystrokeAnalyzer:
    """
    Analyzes keystroke patterns to extract features for writing quality assessment.
    Based on the linking writing processes to writing quality approach.
    """
    
    def __init__(self):
        self.activities = ['Input', 'Remove/Cut', 'Nonproduction', 'Replace', 'Paste']
        self.events = ['Space', 'Backspace', 'Shift', 'ArrowRight', 'ArrowLeft', 
                      'ArrowDown', 'ArrowUp', 'Enter', 'CapsLock', 'Delete', 
                      'Unidentified', 'Meta']
        self.text_changes = [' ', '.', ',', '\n', "'", '"', '-', '?', ';', '=', '/', '\\', ':']
        
    def parse_keystroke_data(self, data: List[Dict]) -> pd.DataFrame:
        """
        Parse keystroke data from JSON format to DataFrame suitable for analysis.
        """
        parsed_data = []
        
        for i, keystroke in enumerate(data):
            # Convert timestamp to datetime
            timestamp = datetime.fromisoformat(keystroke['timestamp'].replace('Z', '+00:00'))
            
            # Determine activity type based on key and type
            if keystroke['type'] == 'delete':
                activity = 'Remove/Cut'
            elif keystroke['type'] == 'input':
                if keystroke['key'] in ['Meta', 'Shift', 'Control', 'Alt']:
                    activity = 'Nonproduction'
                else:
                    activity = 'Input'
            else:
                activity = 'Input'
            
            # Calculate timing features
            down_time = int(timestamp.timestamp() * 1000)  # milliseconds
            up_time = down_time + 50  # Estimate up time
            
            # Text change determination
            if keystroke['type'] == 'delete':
                text_change = 'Backspace'
            elif keystroke['key'] == 'Space':
                text_change = ' '
            elif keystroke['key'] == 'Enter':
                text_change = '\n'
            elif len(keystroke['key']) == 1:
                text_change = keystroke['key']
            else:
                text_change = 'NoChange'
            
            parsed_data.append({
                'id': 'session_1',  # Default session ID
                'event_id': i,
                'down_time': down_time,
                'up_time': up_time,
                'action_time': up_time - down_time,
                'activity': activity,
                'down_event': keystroke['key'],
                'up_event': keystroke['key'],
                'text_change': text_change,
                'cursor_position': i,  # Approximate cursor position
                'word_count': 1 if text_change == ' ' else 0
            })
        
        return pd.DataFrame(parsed_data)
    
    def reconstruct_essay(self, df: pd.DataFrame) -> str:
        """
        Reconstruct the essay text from keystroke data.
        """
        essay_text = ""
        
        for _, row in df.iterrows():
            if row['activity'] == 'Input' and row['text_change'] != 'NoChange':
                if row['text_change'] == 'Backspace':
                    continue
                essay_text += row['text_change']
            elif row['activity'] == 'Remove/Cut':
                if len(essay_text) > 0:
                    essay_text = essay_text[:-1]
        
        return essay_text
    
    def extract_timing_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """
        Extract timing-based features from keystroke data.
        """
        features = {}
        
        # Calculate inter-key intervals
        df_sorted = df.sort_values('event_id')
        df_sorted['up_time_lagged'] = df_sorted['up_time'].shift(1)
        df_sorted['time_diff'] = (df_sorted['down_time'] - df_sorted['up_time_lagged']).fillna(0) / 1000
        
        # Filter for productive keystrokes
        productive_df = df_sorted[df_sorted['activity'].isin(['Input', 'Remove/Cut'])]
        
        if len(productive_df) > 0:
            # Inter-key latency features
            features['inter_key_largest_latency'] = productive_df['time_diff'].max()
            features['inter_key_median_latency'] = productive_df['time_diff'].median()
            features['mean_pause_time'] = productive_df['time_diff'].mean()
            features['std_pause_time'] = productive_df['time_diff'].std()
            features['total_pause_time'] = productive_df['time_diff'].sum()
            
            # Pause duration categories
            features['pauses_half_sec'] = len(productive_df[(productive_df['time_diff'] > 0.5) & 
                                                           (productive_df['time_diff'] < 1)])
            features['pauses_1_sec'] = len(productive_df[(productive_df['time_diff'] > 1) & 
                                                        (productive_df['time_diff'] < 1.5)])
            features['pauses_1_half_sec'] = len(productive_df[(productive_df['time_diff'] > 1.5) & 
                                                             (productive_df['time_diff'] < 2)])
            features['pauses_2_sec'] = len(productive_df[(productive_df['time_diff'] > 2) & 
                                                        (productive_df['time_diff'] < 3)])
            features['pauses_3_sec'] = len(productive_df[productive_df['time_diff'] > 3])
            
            # Keys per second
            total_time = (df_sorted['up_time'].max() - df_sorted['down_time'].min()) / 1000
            features['keys_per_second'] = len(productive_df) / total_time if total_time > 0 else 0
        
        return features
    
    def extract_activity_features(self, df: pd.DataFrame) -> Dict[str, int]:
        """
        Extract activity-based features.
        """
        features = {}
        
        # Count different activities
        activity_counts = df['activity'].value_counts()
        for i, activity in enumerate(self.activities):
            features[f'activity_{i}_cnt'] = activity_counts.get(activity, 0)
        
        # Count different events
        down_event_counts = df['down_event'].value_counts()
        for i, event in enumerate(self.events):
            features[f'down_event_{i}_cnt'] = down_event_counts.get(event, 0)
            features[f'up_event_{i}_cnt'] = down_event_counts.get(event, 0)
        
        # Count text changes
        text_change_counts = df['text_change'].value_counts()
        for i, change in enumerate(self.text_changes):
            features[f'text_change_{i}_cnt'] = text_change_counts.get(change, 0)
        
        # Unique counts
        features['activity_unique'] = df['activity'].nunique()
        features['down_event_unique'] = df['down_event'].nunique()
        features['up_event_unique'] = df['up_event'].nunique()
        features['text_change_unique'] = df['text_change'].nunique()
        
        return features
    
    def extract_statistical_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """
        Extract statistical features from numerical columns.
        """
        features = {}
        num_cols = ['down_time', 'up_time', 'action_time', 'cursor_position', 'word_count']
        
        for col in num_cols:
            if col in df.columns:
                features[f'{col}_mean'] = df[col].mean()
                features[f'{col}_std'] = df[col].std()
                features[f'{col}_median'] = df[col].median()
                features[f'{col}_min'] = df[col].min()
                features[f'{col}_max'] = df[col].max()
                features[f'{col}_sum'] = df[col].sum()
                features[f'{col}_quantile'] = df[col].quantile(0.5)
        
        return features
    
    def extract_text_features(self, essay: str) -> Dict[str, float]:
        """
        Extract text-based features from the reconstructed essay.
        """
        features = {}
        
        if not essay:
            return {f'text_feature_{i}': 0 for i in range(50)}
        
        # Word-level features
        words = re.split(r'[ \n\.\?\!]', essay)
        words = [w for w in words if w.strip()]
        
        if words:
            word_lengths = [len(w) for w in words]
            features['word_count'] = len(words)
            features['word_len_mean'] = np.mean(word_lengths)
            features['word_len_std'] = np.std(word_lengths)
            features['word_len_median'] = np.median(word_lengths)
            features['word_len_min'] = np.min(word_lengths)
            features['word_len_max'] = np.max(word_lengths)
            features['word_len_sum'] = np.sum(word_lengths)
        
        # Sentence-level features
        sentences = re.split(r'[\.\?\!]', essay)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if sentences:
            sent_lengths = [len(s) for s in sentences]
            sent_word_counts = [len(s.split()) for s in sentences]
            
            features['sent_count'] = len(sentences)
            features['sent_len_mean'] = np.mean(sent_lengths)
            features['sent_len_std'] = np.std(sent_lengths)
            features['sent_len_median'] = np.median(sent_lengths)
            features['sent_len_sum'] = np.sum(sent_lengths)
            features['sent_word_count_mean'] = np.mean(sent_word_counts)
            features['sent_word_count_median'] = np.median(sent_word_counts)
            features['sent_word_count_sum'] = np.sum(sent_word_counts)
        
        # Paragraph-level features
        paragraphs = essay.split('\n')
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        if paragraphs:
            para_lengths = [len(p) for p in paragraphs]
            para_word_counts = [len(p.split()) for p in paragraphs]
            
            features['paragraph_count'] = len(paragraphs)
            features['paragraph_len_mean'] = np.mean(para_lengths)
            features['paragraph_len_max'] = np.max(para_lengths)
            features['paragraph_len_sum'] = np.sum(para_lengths)
            features['paragraph_word_count_mean'] = np.mean(para_word_counts)
            features['paragraph_word_count_max'] = np.max(para_word_counts)
            features['paragraph_word_count_sum'] = np.sum(para_word_counts)
        
        # Overall text features
        features['essay_length'] = len(essay)
        features['product_to_keys'] = len(essay) / max(len(words), 1)
        
        return features
    
    def extract_burst_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """
        Extract P-bursts and R-bursts features.
        """
        features = {}
        
        # P-bursts (writing bursts - continuous typing with pauses < 2 seconds)
        df_sorted = df.sort_values('event_id')
        df_sorted['up_time_lagged'] = df_sorted['up_time'].shift(1)
        df_sorted['time_diff'] = (df_sorted['down_time'] - df_sorted['up_time_lagged']).fillna(0) / 1000
        
        productive_df = df_sorted[df_sorted['activity'].isin(['Input', 'Remove/Cut'])]
        
        if len(productive_df) > 0:
            # P-bursts
            productive_df['is_burst'] = productive_df['time_diff'] < 2
            burst_groups = productive_df.groupby((~productive_df['is_burst']).cumsum())
            burst_lengths = burst_groups.size()
            
            if len(burst_lengths) > 0:
                features['P_bursts_mean'] = burst_lengths.mean()
                features['P_bursts_std'] = burst_lengths.std()
                features['P_bursts_count'] = len(burst_lengths)
                features['P_bursts_median'] = burst_lengths.median()
                features['P_bursts_max'] = burst_lengths.max()
        
        # R-bursts (revision bursts - continuous deletion)
        revision_df = df_sorted[df_sorted['activity'] == 'Remove/Cut']
        if len(revision_df) > 0:
            # Group consecutive revisions
            revision_df['group'] = (revision_df['event_id'].diff() != 1).cumsum()
            revision_groups = revision_df.groupby('group').size()
            
            if len(revision_groups) > 0:
                features['R_bursts_mean'] = revision_groups.mean()
                features['R_bursts_std'] = revision_groups.std()
                features['R_bursts_median'] = revision_groups.median()
                features['R_bursts_max'] = revision_groups.max()
        
        return features
    
    def extract_all_features(self, keystroke_data: List[Dict]) -> Dict[str, Any]:
        """
        Extract all features from keystroke data.
        """
        # Parse keystroke data
        df = self.parse_keystroke_data(keystroke_data)
        
        # Reconstruct essay
        essay = self.reconstruct_essay(df)
        
        # Extract all feature types
        features = {}
        features.update(self.extract_timing_features(df))
        features.update(self.extract_activity_features(df))
        features.update(self.extract_statistical_features(df))
        features.update(self.extract_text_features(essay))
        features.update(self.extract_burst_features(df))
        
        # Add essay text for further processing
        features['essay_text'] = essay
        
        return features
    
    def create_feature_vector(self, features: Dict[str, Any]) -> np.ndarray:
        """
        Create a feature vector from extracted features.
        """
        # Remove non-numeric features
        numeric_features = {k: v for k, v in features.items() 
                          if isinstance(v, (int, float, np.number)) and not np.isnan(v)}
        
        # Convert to array
        feature_vector = np.array(list(numeric_features.values()))
        
        return feature_vector 