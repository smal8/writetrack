#!/usr/bin/env python3
"""
Demo script for writing quality prediction from keystroke data.
This script demonstrates how to use the writing quality predictor with the sample data.
"""

import json
import numpy as np
import pandas as pd
from typing import List, Dict
from writing_quality_model import WritingQualityPredictor

def load_sample_data(filepath: str) -> List[Dict]:
    """Load sample keystroke data from JSON file."""
    with open(filepath, 'r') as f:
        data = json.load(f)
    return data

def demonstrate_prediction():
    """Demonstrate the writing quality prediction system."""
    print("=== Writing Quality Prediction Demo ===\n")
    
    # Initialize predictor
    print("1. Initializing predictor...")
    predictor = WritingQualityPredictor()
    
    # Load sample data
    print("2. Loading sample keystroke data...")
    sample_data = load_sample_data('data/random.json')
    print(f"   Loaded {len(sample_data)} keystrokes")
    
    # Analyze the sample data
    print("\n3. Analyzing keystroke patterns...")
    
    # Extract features using the keystroke analyzer
    features = predictor.keystroke_analyzer.extract_all_features(sample_data)
    print(f"   Extracted {len(features)} features")
    
    # Show some key features
    print("\n4. Key features extracted:")
    interesting_features = [
        'keys_per_second', 'mean_pause_time', 'word_count', 'essay_length',
        'paragraph_count', 'sent_count', 'activity_0_cnt', 'activity_1_cnt'
    ]
    
    for feature in interesting_features:
        if feature in features:
            print(f"   {feature}: {features[feature]:.3f}")
    
    # Show reconstructed essay
    essay = features.get('essay_text', '')
    print(f"\n5. Reconstructed essay text:")
    print(f"   '{essay}'")
    
    # Since we don't have a trained model, let's show how training would work
    print("\n6. Training demonstration (with synthetic data)...")
    
    # Create synthetic training data for demonstration
    synthetic_data = create_synthetic_training_data(sample_data)
    
    print(f"   Created {len(synthetic_data['keystroke_data'])} synthetic samples")
    print(f"   Score range: {min(synthetic_data['scores']):.1f} - {max(synthetic_data['scores']):.1f}")
    
    # Train the model
    print("\n7. Training the model...")
    try:
        results = predictor.train(
            synthetic_data['keystroke_data'],
            synthetic_data['scores']
        )
        print(f"   Training completed!")
        print(f"   Best ensemble CV RMSE: {results['ensemble_score']:.4f}")
        
        # Make prediction on original sample
        print("\n8. Making prediction on original sample...")
        prediction = predictor.predict(sample_data)
        print(f"   Predicted writing quality score: {prediction:.2f}")
        
        # Show feature importance
        print("\n9. Top 10 most important features:")
        importance = predictor.model.feature_importance(top_n=10)
        if not importance.empty:
            for feature, imp in importance.iterrows():
                print(f"   {feature}: {imp['importance']:.4f}")
        
    except Exception as e:
        print(f"   Training failed: {e}")
        print("   This is expected as we're using synthetic data for demonstration")
    
    print("\n=== Demo Complete ===")

def create_synthetic_training_data(base_sample: List[Dict], n_samples: int = 50) -> Dict:
    """Create synthetic training data for demonstration."""
    import random
    
    keystroke_data = []
    scores = []
    
    for i in range(n_samples):
        # Create variations of the base sample
        synthetic_sample = create_sample_variation(base_sample, i)
        keystroke_data.append(synthetic_sample)
        
        # Assign random scores for demonstration
        scores.append(random.uniform(1.0, 6.0))
    
    return {
        'keystroke_data': keystroke_data,
        'scores': scores
    }

def create_sample_variation(base_sample: List[Dict], seed: int) -> List[Dict]:
    """Create a variation of the base sample."""
    import random
    random.seed(seed)
    
    # Create a copy of the base sample
    variation = base_sample.copy()
    
    # Add some random variations
    for i in range(random.randint(5, 15)):
        # Add random keystrokes
        variation.append({
            'key': random.choice(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']),
            'type': 'input',
            'timestamp': f"2025-04-14T14:54:{20 + i:02d}.{random.randint(100, 999):03d}Z"
        })
        
        # Sometimes add backspaces
        if random.random() < 0.3:
            variation.append({
                'key': 'Backspace',
                'type': 'delete',
                'timestamp': f"2025-04-14T14:54:{20 + i:02d}.{random.randint(100, 999):03d}Z"
            })
    
    return variation

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
    from collections import Counter
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
    from datetime import datetime
    times = [datetime.fromisoformat(ts.replace('Z', '+00:00')) for ts in timestamps]
    intervals = [(times[i+1] - times[i]).total_seconds() for i in range(len(times)-1)]
    
    if intervals:
        print(f"  Mean interval: {np.mean(intervals):.3f} seconds")
        print(f"  Median interval: {np.median(intervals):.3f} seconds")
        print(f"  Max interval: {max(intervals):.3f} seconds")

def create_requirements_file():
    """Create a requirements.txt file for the project."""
    requirements = [
        "numpy>=1.21.0",
        "pandas>=1.3.0",
        "scikit-learn>=1.0.0",
        "scipy>=1.7.0",
        "xgboost>=1.5.0",
        "lightgbm>=3.3.0",
        "matplotlib>=3.5.0",
        "seaborn>=0.11.0",
        "tqdm>=4.62.0"
    ]
    
    with open('requirements.txt', 'w') as f:
        f.write('\n'.join(requirements))
    
    print("Created requirements.txt file")

def main():
    """Main function to run the demo."""
    print("Welcome to the Writing Quality Prediction System!")
    print("This demo will show you how to analyze keystroke data and predict writing quality.\n")
    
    # First, analyze the sample data
    sample_data = load_sample_data('data/random.json')
    analyze_keystroke_patterns(sample_data)
    
    print("\n" + "="*50 + "\n")
    
    # Run the prediction demo
    demonstrate_prediction()
    
    # Create requirements file
    print("\n" + "="*50 + "\n")
    create_requirements_file()
    
    print("\nTo use this system:")
    print("1. Install requirements: pip install -r requirements.txt")
    print("2. Prepare your keystroke data in JSON format")
    print("3. Use WritingQualityPredictor class to train and predict")
    print("4. See the demo code above for detailed usage examples")

if __name__ == "__main__":
    main() 