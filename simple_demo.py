#!/usr/bin/env python3
"""
Simplified demo script for writing quality prediction that doesn't require heavy ML dependencies.
This demonstrates the core keystroke analysis functionality.
"""

import json
import numpy as np
import pandas as pd
from typing import List, Dict
from collections import Counter
from datetime import datetime
import os
import sys

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from keystroke_analyzer import KeystrokeAnalyzer
from text_processor import TextProcessor

def load_sample_data(filepath: str) -> List[Dict]:
    """Load sample keystroke data from JSON file."""
    with open(filepath, 'r') as f:
        data = json.load(f)
    return data

def analyze_keystroke_patterns(data: List[Dict]):
    """Analyze and print keystroke patterns."""
    print("=== Keystroke Pattern Analysis ===\n")
    
    # Basic statistics
    total_keystrokes = len(data)
    input_keys = sum(1 for k in data if k['type'] == 'input')
    delete_keys = sum(1 for k in data if k['type'] == 'delete')
    
    print(f"Total keystrokes: {total_keystrokes}")
    print(f"Input keys: {input_keys}")
    print(f"Delete keys: {delete_keys}")
    print(f"Delete ratio: {delete_keys / total_keystrokes:.2%}")
    
    # Key frequency
    key_counts = Counter(k['key'] for k in data)
    print(f"\nMost common keys:")
    for key, count in key_counts.most_common(10):
        print(f"  {key}: {count}")
    
    # Timing analysis
    timestamps = [k['timestamp'] for k in data]
    print(f"\nTiming info:")
    print(f"  First keystroke: {timestamps[0]}")
    print(f"  Last keystroke: {timestamps[-1]}")
    
    # Calculate inter-keystroke intervals
    times = [datetime.fromisoformat(ts.replace('Z', '+00:00')) for ts in timestamps]
    intervals = [(times[i+1] - times[i]).total_seconds() for i in range(len(times)-1)]
    
    if intervals:
        print(f"  Mean interval: {np.mean(intervals):.3f} seconds")
        print(f"  Median interval: {np.median(intervals):.3f} seconds")
        print(f"  Max interval: {max(intervals):.3f} seconds")
        print(f"  Min interval: {min(intervals):.3f} seconds")

def demonstrate_feature_extraction():
    """Demonstrate feature extraction from keystroke data."""
    print("=== Feature Extraction Demo ===\n")
    
    # Initialize analyzer
    print("1. Initializing keystroke analyzer...")
    analyzer = KeystrokeAnalyzer()
    
    # Load sample data
    print("2. Loading sample keystroke data...")
    sample_data = load_sample_data('data/random.json')
    print(f"   Loaded {len(sample_data)} keystrokes")
    
    # Extract features
    print("\n3. Extracting features...")
    features = analyzer.extract_all_features(sample_data)
    print(f"   Extracted {len(features)} features")
    
    # Show some key features
    print("\n4. Key features extracted:")
    interesting_features = [
        'keys_per_second', 'mean_pause_time', 'word_count', 'essay_length',
        'paragraph_count', 'sent_count', 'activity_0_cnt', 'activity_1_cnt',
        'punctuation_density', 'word_diversity'
    ]
    
    for feature in interesting_features:
        if feature in features:
            value = features[feature]
            if isinstance(value, (int, float)):
                print(f"   {feature}: {value:.3f}")
            else:
                print(f"   {feature}: {value}")
    
    # Show reconstructed essay
    essay = features.get('essay_text', '')
    print(f"\n5. Reconstructed essay text:")
    print(f"   '{essay}'")
    
    return features

def demonstrate_text_processing():
    """Demonstrate text processing capabilities."""
    print("\n=== Text Processing Demo ===\n")
    
    # Initialize processor
    print("1. Initializing text processor...")
    processor = TextProcessor()
    
    # Load sample data and reconstruct essay
    sample_data = load_sample_data('data/random.json')
    essay = processor.reconstruct_essay_advanced(sample_data)
    
    print(f"2. Reconstructed essay: '{essay}'")
    
    # Process the essay
    print("\n3. Processing essay text...")
    if essay:
        # Extract comprehensive features
        features = processor.process_essay_comprehensive(essay)
        
        # Show some interesting text features
        print("\n4. Text analysis features:")
        text_features = [
            'word_count', 'unique_word_count', 'word_diversity',
            'sent_count', 'paragraph_count', 'punctuation_density',
            'capital_letter_density', 'avg_chars_per_word'
        ]
        
        for feature in text_features:
            if feature in features:
                value = features[feature]
                if isinstance(value, (int, float)):
                    print(f"   {feature}: {value:.3f}")
                else:
                    print(f"   {feature}: {value}")
    else:
        print("   No text to analyze (essay is empty)")

def simple_quality_prediction(features: Dict) -> float:
    """
    Simple rule-based quality prediction for demonstration.
    In a real system, this would use trained ML models.
    """
    
    # Extract key features for prediction
    keys_per_second = features.get('keys_per_second', 0)
    mean_pause_time = features.get('mean_pause_time', 0)
    word_count = features.get('word_count', 0)
    essay_length = features.get('essay_length', 0)
    paragraph_count = features.get('paragraph_count', 1)
    word_diversity = features.get('word_diversity', 0)
    punctuation_density = features.get('punctuation_density', 0)
    
    # Simple scoring based on heuristics
    score = 3.0  # Base score
    
    # Typing speed factor
    if keys_per_second > 2:
        score += 0.5
    elif keys_per_second > 1:
        score += 0.2
    
    # Text length factor
    if essay_length > 100:
        score += 0.3
    elif essay_length > 50:
        score += 0.1
    
    # Word diversity factor
    if word_diversity > 0.7:
        score += 0.4
    elif word_diversity > 0.5:
        score += 0.2
    
    # Paragraph organization
    if paragraph_count > 1:
        score += 0.3
    
    # Punctuation usage
    if punctuation_density > 0.05:
        score += 0.2
    
    # Pause patterns (moderate pauses are good)
    if 0.2 < mean_pause_time < 2.0:
        score += 0.3
    
    # Ensure score is in valid range
    score = max(0.5, min(6.0, score))
    
    return score

def demonstrate_prediction():
    """Demonstrate simple prediction functionality."""
    print("=== Simple Prediction Demo ===\n")
    
    # Extract features
    analyzer = KeystrokeAnalyzer()
    sample_data = load_sample_data('data/random.json')
    features = analyzer.extract_all_features(sample_data)
    
    # Make prediction
    print("1. Making quality prediction...")
    prediction = simple_quality_prediction(features)
    
    print(f"   Predicted writing quality: {prediction:.2f}")
    
    # Explain the prediction
    print("\n2. Prediction explanation:")
    print("   This is a simple rule-based prediction based on:")
    print("   - Typing speed and patterns")
    print("   - Text length and structure")
    print("   - Word diversity and vocabulary")
    print("   - Punctuation usage")
    print("   - Pause patterns")
    
    print("\n   Note: In a real system, this would use trained ML models")
    print("   with ensemble methods for much better accuracy.")

def main():
    """Main function to run the simplified demo."""
    # Check if a file path was provided as command line argument
    if len(sys.argv) > 1:
        # API mode - just output the quality score
        filepath = sys.argv[1]
        try:
            # Load data from provided file
            sample_data = load_sample_data(filepath)
            
            # Extract features
            analyzer = KeystrokeAnalyzer()
            features = analyzer.extract_all_features(sample_data)
            
            # Make prediction
            prediction = simple_quality_prediction(features)
            
            # Output in format expected by API
            print(f"Quality Score: {prediction:.2f}")
            
        except Exception as e:
            print(f"Error analyzing file: {e}")
            sys.exit(1)
        return
    
    # Interactive demo mode
    print("Welcome to the Writing Quality Prediction System!")
    print("This is a simplified demo showing core functionality.\n")
    
    try:
        # Check if sample data exists
        if not os.path.exists('data/random.json'):
            print("Error: Sample data file 'data/random.json' not found.")
            print("Please make sure the data directory exists with the sample file.")
            return
        
        # Analyze keystroke patterns
        sample_data = load_sample_data('data/random.json')
        analyze_keystroke_patterns(sample_data)
        
        print("\n" + "="*60 + "\n")
        
        # Demonstrate feature extraction
        features = demonstrate_feature_extraction()
        
        print("\n" + "="*60 + "\n")
        
        # Demonstrate text processing
        demonstrate_text_processing()
        
        print("\n" + "="*60 + "\n")
        
        # Demonstrate prediction
        demonstrate_prediction()
        
        print("\n" + "="*60 + "\n")
        
        print("Demo completed successfully!")
        print("\nNext steps:")
        print("1. Install full ML dependencies: pip install -r requirements.txt")
        print("2. Run the full demo: python demo_predictor.py")
        print("3. Start the API server: python writing_quality_api.py")
        print("4. Integrate with your WriteTrack application")
        
    except Exception as e:
        print(f"Error running demo: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 