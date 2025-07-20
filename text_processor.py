import numpy as np
import pandas as pd
import re
from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.decomposition import LatentDirichletAllocation, PCA, TruncatedSVD
from sklearn.preprocessing import StandardScaler
from sklearn.manifold import TSNE
import warnings
warnings.filterwarnings('ignore')

class TextProcessor:
    """
    Advanced text processing for writing quality assessment.
    Handles essay reconstruction, n-gram analysis, and topic modeling.
    """
    
    def __init__(self):
        self.count_vectorizer = None
        self.tfidf_vectorizer = None
        self.lda_models = {}
        self.pca_model = None
        self.tsne_models = {}
        self.scaler = StandardScaler()
        
    def reconstruct_essay_advanced(self, keystroke_data: List[Dict]) -> str:
        """
        Advanced essay reconstruction handling various text operations.
        """
        essay_text = ""
        
        for keystroke in keystroke_data:
            if keystroke['type'] == 'input':
                if keystroke['key'] == 'Space':
                    essay_text += ' '
                elif keystroke['key'] == 'Enter':
                    essay_text += '\n'
                elif len(keystroke['key']) == 1:
                    essay_text += keystroke['key']
                # Handle special keys that might insert text
                elif keystroke['key'] in ['Tab']:
                    essay_text += '\t'
            elif keystroke['type'] == 'delete':
                if len(essay_text) > 0:
                    essay_text = essay_text[:-1]
        
        return essay_text.strip()
    
    def extract_ngram_features(self, essays: List[str], ngram_range: Tuple[int, int] = (1, 4), 
                              analyzer: str = 'char_wb', max_features: int = 2000) -> np.ndarray:
        """
        Extract n-gram features from essays using CountVectorizer.
        """
        if not self.count_vectorizer:
            self.count_vectorizer = CountVectorizer(
                ngram_range=ngram_range,
                analyzer=analyzer,
                max_features=max_features,
                stop_words='english' if analyzer == 'word' else None
            )
            
        # Fit and transform if not already fitted
        if not hasattr(self.count_vectorizer, 'vocabulary_'):
            features = self.count_vectorizer.fit_transform(essays)
        else:
            features = self.count_vectorizer.transform(essays)
            
        return features.toarray()
    
    def extract_tfidf_features(self, essays: List[str], max_features: int = 1000) -> np.ndarray:
        """
        Extract TF-IDF features from essays.
        """
        if not self.tfidf_vectorizer:
            self.tfidf_vectorizer = TfidfVectorizer(
                max_features=max_features,
                stop_words='english',
                ngram_range=(1, 2)
            )
            
        if not hasattr(self.tfidf_vectorizer, 'vocabulary_'):
            features = self.tfidf_vectorizer.fit_transform(essays)
        else:
            features = self.tfidf_vectorizer.transform(essays)
            
        return features.toarray()
    
    def extract_topic_features(self, essays: List[str], n_topics: int = 6, 
                              analyzer: str = 'word', ngram_range: Tuple[int, int] = (1, 1)) -> np.ndarray:
        """
        Extract topic modeling features using LDA.
        """
        model_key = f"{analyzer}_{ngram_range[0]}_{ngram_range[1]}_{n_topics}"
        
        # Create vectorizer for this configuration
        if analyzer == 'word':
            vectorizer = CountVectorizer(
                stop_words='english',
                ngram_range=ngram_range,
                max_features=1000
            )
        else:
            vectorizer = CountVectorizer(
                analyzer='char_wb',
                ngram_range=ngram_range,
                max_features=1000
            )
        
        # Vectorize essays
        essay_vectors = vectorizer.fit_transform(essays)
        
        # Train LDA model if not exists
        if model_key not in self.lda_models:
            self.lda_models[model_key] = LatentDirichletAllocation(
                n_components=n_topics,
                max_iter=10,
                random_state=42,
                doc_topic_prior=None,
                topic_word_prior=None
            )
            self.lda_models[model_key].fit(essay_vectors)
        
        # Transform essays to topic distributions
        topic_distributions = self.lda_models[model_key].transform(essay_vectors)
        
        return topic_distributions
    
    def extract_word_level_features(self, essay: str) -> Dict[str, float]:
        """
        Extract detailed word-level features.
        """
        features = {}
        
        if not essay:
            return {f'word_feature_{i}': 0 for i in range(20)}
        
        # Split into words
        words = re.split(r'[ \n\.\?\!,;:]', essay)
        words = [w.strip() for w in words if w.strip()]
        
        if words:
            word_lengths = [len(w) for w in words]
            
            # Basic statistics
            features['word_count'] = len(words)
            features['word_len_mean'] = np.mean(word_lengths)
            features['word_len_std'] = np.std(word_lengths)
            features['word_len_median'] = np.median(word_lengths)
            features['word_len_min'] = np.min(word_lengths)
            features['word_len_max'] = np.max(word_lengths)
            features['word_len_sum'] = np.sum(word_lengths)
            features['word_len_q2'] = np.percentile(word_lengths, 25)
            features['word_len_q7'] = np.percentile(word_lengths, 75)
            
            # Advanced statistics
            features['word_len_skew'] = np.mean([(x - np.mean(word_lengths))**3 for x in word_lengths])
            features['word_len_kurtosis'] = np.mean([(x - np.mean(word_lengths))**4 for x in word_lengths])
            
            # Unique words
            unique_words = set(words)
            features['unique_word_count'] = len(unique_words)
            features['word_diversity'] = len(unique_words) / len(words)
            
            # Character analysis
            features['avg_chars_per_word'] = np.mean([len(w) for w in words])
            features['long_words_count'] = len([w for w in words if len(w) > 6])
            features['short_words_count'] = len([w for w in words if len(w) <= 3])
        
        return features
    
    def extract_sentence_features(self, essay: str) -> Dict[str, float]:
        """
        Extract detailed sentence-level features.
        """
        features = {}
        
        if not essay:
            return {f'sent_feature_{i}': 0 for i in range(15)}
        
        # Split into sentences
        sentences = re.split(r'[\.\?\!]', essay)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if sentences:
            sent_lengths = [len(s) for s in sentences]
            sent_word_counts = [len(s.split()) for s in sentences]
            
            # Length statistics
            features['sent_count'] = len(sentences)
            features['sent_len_mean'] = np.mean(sent_lengths)
            features['sent_len_std'] = np.std(sent_lengths)
            features['sent_len_median'] = np.median(sent_lengths)
            features['sent_len_min'] = np.min(sent_lengths)
            features['sent_len_max'] = np.max(sent_lengths)
            features['sent_len_sum'] = np.sum(sent_lengths)
            features['sent_len_q2'] = np.percentile(sent_lengths, 25)
            features['sent_len_q7'] = np.percentile(sent_lengths, 75)
            
            # Word count statistics
            features['sent_word_count_mean'] = np.mean(sent_word_counts)
            features['sent_word_count_std'] = np.std(sent_word_counts)
            features['sent_word_count_median'] = np.median(sent_word_counts)
            features['sent_word_count_min'] = np.min(sent_word_counts)
            features['sent_word_count_max'] = np.max(sent_word_counts)
            features['sent_word_count_sum'] = np.sum(sent_word_counts)
            features['sent_word_count_q2'] = np.percentile(sent_word_counts, 25)
            features['sent_word_count_q7'] = np.percentile(sent_word_counts, 75)
        
        return features
    
    def extract_paragraph_features(self, essay: str) -> Dict[str, float]:
        """
        Extract paragraph-level features.
        """
        features = {}
        
        if not essay:
            return {f'para_feature_{i}': 0 for i in range(15)}
        
        # Split into paragraphs
        paragraphs = essay.split('\n')
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        if paragraphs:
            para_lengths = [len(p) for p in paragraphs]
            para_word_counts = [len(p.split()) for p in paragraphs]
            
            # Length statistics
            features['paragraph_count'] = len(paragraphs)
            features['paragraph_len_mean'] = np.mean(para_lengths)
            features['paragraph_len_std'] = np.std(para_lengths)
            features['paragraph_len_median'] = np.median(para_lengths)
            features['paragraph_len_min'] = np.min(para_lengths)
            features['paragraph_len_max'] = np.max(para_lengths)
            features['paragraph_len_sum'] = np.sum(para_lengths)
            features['paragraph_len_q2'] = np.percentile(para_lengths, 25)
            features['paragraph_len_q7'] = np.percentile(para_lengths, 75)
            
            # Word count statistics
            features['paragraph_word_count_mean'] = np.mean(para_word_counts)
            features['paragraph_word_count_std'] = np.std(para_word_counts)
            features['paragraph_word_count_median'] = np.median(para_word_counts)
            features['paragraph_word_count_min'] = np.min(para_word_counts)
            features['paragraph_word_count_max'] = np.max(para_word_counts)
            features['paragraph_word_count_sum'] = np.sum(para_word_counts)
            features['paragraph_word_count_q2'] = np.percentile(para_word_counts, 25)
            features['paragraph_word_count_q7'] = np.percentile(para_word_counts, 75)
        
        return features
    
    def extract_linguistic_features(self, essay: str) -> Dict[str, float]:
        """
        Extract linguistic and stylistic features.
        """
        features = {}
        
        if not essay:
            return {f'linguistic_feature_{i}': 0 for i in range(10)}
        
        # Punctuation analysis
        punctuation_marks = '.!?,:;'
        features['punctuation_count'] = sum(essay.count(p) for p in punctuation_marks)
        features['punctuation_density'] = features['punctuation_count'] / len(essay)
        
        # Capitalization
        features['capital_letter_count'] = sum(1 for c in essay if c.isupper())
        features['capital_letter_density'] = features['capital_letter_count'] / len(essay)
        
        # Digit analysis
        features['digit_count'] = sum(1 for c in essay if c.isdigit())
        features['digit_density'] = features['digit_count'] / len(essay)
        
        # Special characters
        features['special_char_count'] = sum(1 for c in essay if not c.isalnum() and not c.isspace())
        features['special_char_density'] = features['special_char_count'] / len(essay)
        
        # Line breaks and spacing
        features['line_break_count'] = essay.count('\n')
        features['multiple_space_count'] = len(re.findall(r'\s{2,}', essay))
        
        return features
    
    def create_dimensionality_reduction_features(self, feature_matrix: np.ndarray, 
                                               n_components: int = 100) -> np.ndarray:
        """
        Create dimensionality reduction features using PCA.
        """
        if not self.pca_model:
            self.pca_model = PCA(n_components=n_components, random_state=42)
            reduced_features = self.pca_model.fit_transform(feature_matrix)
        else:
            reduced_features = self.pca_model.transform(feature_matrix)
            
        return reduced_features
    
    def create_tsne_features(self, feature_matrix: np.ndarray, perplexity: int = 20, 
                            n_components: int = 2) -> np.ndarray:
        """
        Create t-SNE features for visualization and additional feature engineering.
        """
        tsne_key = f"tsne_{perplexity}_{n_components}"
        
        if tsne_key not in self.tsne_models:
            self.tsne_models[tsne_key] = TSNE(
                n_components=n_components,
                perplexity=perplexity,
                random_state=42,
                n_jobs=-1
            )
            tsne_features = self.tsne_models[tsne_key].fit_transform(feature_matrix)
        else:
            # t-SNE doesn't support transform, so we'll return zeros for new data
            tsne_features = np.zeros((feature_matrix.shape[0], n_components))
            
        return tsne_features
    
    def process_essay_comprehensive(self, essay: str) -> Dict[str, Any]:
        """
        Comprehensive essay processing combining all text analysis methods.
        """
        features = {}
        
        # Basic text features
        features.update(self.extract_word_level_features(essay))
        features.update(self.extract_sentence_features(essay))
        features.update(self.extract_paragraph_features(essay))
        features.update(self.extract_linguistic_features(essay))
        
        # Store essay for further processing
        features['essay_text'] = essay
        
        return features
    
    def create_advanced_features(self, essays: List[str]) -> Dict[str, np.ndarray]:
        """
        Create advanced features including n-grams, topics, and dimensionality reduction.
        """
        features = {}
        
        # N-gram features (character-level)
        features['ngram_char_1_4'] = self.extract_ngram_features(
            essays, ngram_range=(1, 4), analyzer='char_wb'
        )
        
        # N-gram features (word-level)
        features['ngram_word_1_2'] = self.extract_ngram_features(
            essays, ngram_range=(1, 2), analyzer='word'
        )
        
        # TF-IDF features
        features['tfidf'] = self.extract_tfidf_features(essays)
        
        # Topic modeling with different configurations
        features['topics_word'] = self.extract_topic_features(
            essays, n_topics=6, analyzer='word', ngram_range=(1, 1)
        )
        
        features['topics_char'] = self.extract_topic_features(
            essays, n_topics=6, analyzer='char_wb', ngram_range=(1, 1)
        )
        
        features['topics_char_5_6'] = self.extract_topic_features(
            essays, n_topics=6, analyzer='char_wb', ngram_range=(5, 6)
        )
        
        # Dimensionality reduction on combined features
        combined_features = np.concatenate([
            features['ngram_char_1_4'],
            features['tfidf'],
            features['topics_word'],
            features['topics_char']
        ], axis=1)
        
        # PCA features
        features['pca_100'] = self.create_dimensionality_reduction_features(
            combined_features, n_components=100
        )
        
        # t-SNE features with different perplexities
        features['tsne_20'] = self.create_tsne_features(
            combined_features, perplexity=20, n_components=2
        )
        
        features['tsne_50'] = self.create_tsne_features(
            combined_features, perplexity=50, n_components=2
        )
        
        features['tsne_80'] = self.create_tsne_features(
            combined_features, perplexity=80, n_components=2
        )
        
        return features 