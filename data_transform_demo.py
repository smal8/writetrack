#!/usr/bin/env python3
"""
Data Transformation Pipeline Demo
Shows how JSON keystroke data is transformed for the ML model.
"""

import json
import numpy as np
import pandas as pd
from typing import List, Dict
from keystroke_analyzer import KeystrokeAnalyzer
from text_processor import TextProcessor

def show_transformation_pipeline():
    """Demonstrate the complete data transformation pipeline."""
    print("=== DATA TRANSFORMATION PIPELINE ===\n")
    
    # Step 1: Load raw JSON data
    print("📄 STEP 1: Raw JSON Data")
    print("-" * 40)
    with open('data/random.json', 'r') as f:
        raw_data = json.load(f)
    
    print(f"Raw data type: {type(raw_data)}")
    print(f"Number of keystrokes: {len(raw_data)}")
    print("First 3 keystrokes:")
    for i, keystroke in enumerate(raw_data[:3]):
        print(f"  {i+1}. {keystroke}")
    print("...")
    
    # Step 2: Parse to DataFrame
    print(f"\n🔄 STEP 2: Parse to Structured DataFrame")
    print("-" * 40)
    analyzer = KeystrokeAnalyzer()
    df = analyzer.parse_keystroke_data(raw_data)
    
    print(f"DataFrame shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print("\nFirst 5 rows:")
    print(df.head().to_string())
    
    # Step 3: Essay Reconstruction
    print(f"\n📝 STEP 3: Essay Reconstruction")
    print("-" * 40)
    essay = analyzer.reconstruct_essay(df)
    print(f"Reconstructed essay: '{essay}'")
    print(f"Essay length: {len(essay)} characters")
    
    # Step 4: Feature Extraction
    print(f"\n🧮 STEP 4: Feature Extraction")
    print("-" * 40)
    features = analyzer.extract_all_features(raw_data)
    print(f"Total features extracted: {len(features)}")
    
    # Show feature categories
    print("\nFeature categories:")
    
    # Timing features
    timing_features = {k: v for k, v in features.items() if any(word in k.lower() for word in ['time', 'pause', 'latency', 'second'])}
    print(f"  • Timing features: {len(timing_features)}")
    for k, v in list(timing_features.items())[:3]:
        print(f"    - {k}: {v}")
    
    # Activity features  
    activity_features = {k: v for k, v in features.items() if 'activity' in k.lower() or 'event' in k.lower()}
    print(f"  • Activity features: {len(activity_features)}")
    for k, v in list(activity_features.items())[:3]:
        print(f"    - {k}: {v}")
    
    # Text features
    text_features = {k: v for k, v in features.items() if any(word in k.lower() for word in ['word', 'sent', 'paragraph', 'essay'])}
    print(f"  • Text features: {len(text_features)}")
    for k, v in list(text_features.items())[:3]:
        print(f"    - {k}: {v}")
    
    # Statistical features
    stat_features = {k: v for k, v in features.items() if any(word in k.lower() for word in ['mean', 'std', 'median', 'max', 'min'])}
    print(f"  • Statistical features: {len(stat_features)}")
    for k, v in list(stat_features.items())[:3]:
        print(f"    - {k}: {v}")
    
    # Step 5: Create Feature Vector
    print(f"\n🎯 STEP 5: Create Feature Vector for Model")
    print("-" * 40)
    
    # Remove non-numeric features
    numeric_features = {k: v for k, v in features.items() 
                       if isinstance(v, (int, float, np.number)) and not np.isnan(v)}
    
    feature_vector = np.array(list(numeric_features.values()))
    feature_names = list(numeric_features.keys())
    
    print(f"Feature vector shape: {feature_vector.shape}")
    print(f"Data type: {feature_vector.dtype}")
    print(f"Value range: [{feature_vector.min():.3f}, {feature_vector.max():.3f}]")
    
    print(f"\nFirst 10 features:")
    for i in range(min(10, len(feature_names))):
        print(f"  {i+1:2d}. {feature_names[i]:30s} = {feature_vector[i]:8.3f}")
    
    # Step 6: DataFrame Format (for model)
    print(f"\n📊 STEP 6: DataFrame Format for Model")
    print("-" * 40)
    
    feature_df = pd.DataFrame([numeric_features])
    print(f"DataFrame shape: {feature_df.shape}")
    print(f"Memory usage: {feature_df.memory_usage(deep=True).sum()} bytes")
    
    print("\nSample of final features:")
    sample_cols = feature_df.columns[:8]  # First 8 columns
    print(feature_df[sample_cols].to_string())
    
    return {
        'raw_data': raw_data,
        'dataframe': df,
        'essay': essay,
        'features': features,
        'feature_vector': feature_vector,
        'feature_names': feature_names,
        'model_input': feature_df
    }

def show_detailed_feature_breakdown():
    """Show detailed breakdown of feature types."""
    print(f"\n🔍 DETAILED FEATURE BREAKDOWN")
    print("=" * 50)
    
    analyzer = KeystrokeAnalyzer()
    with open('data/random.json', 'r') as f:
        raw_data = json.load(f)
    
    # Get the parsed DataFrame
    df = analyzer.parse_keystroke_data(raw_data)
    
    print(f"📋 Parsed DataFrame Details:")
    print(f"  Shape: {df.shape}")
    print(f"  Columns: {df.columns.tolist()}")
    print(f"  Data types:")
    for col, dtype in df.dtypes.items():
        print(f"    {col:20s}: {dtype}")
    
    print(f"\n📊 Sample Data Records:")
    print(df.head(3).to_string())
    
    print(f"\n🎯 Individual Feature Extraction Steps:")
    
    # Timing features
    print("\n1. TIMING FEATURES:")
    timing_features = analyzer.extract_timing_features(df)
    for k, v in timing_features.items():
        print(f"   {k:30s} = {v:8.3f}")
    
    # Activity features
    print("\n2. ACTIVITY FEATURES:")
    activity_features = analyzer.extract_activity_features(df)
    for k, v in list(activity_features.items())[:10]:  # First 10
        print(f"   {k:30s} = {v:8}")
    print(f"   ... and {len(activity_features)-10} more")
    
    # Statistical features
    print("\n3. STATISTICAL FEATURES:")
    stat_features = analyzer.extract_statistical_features(df)
    for k, v in list(stat_features.items())[:8]:  # First 8
        print(f"   {k:30s} = {v:8.3f}")
    print(f"   ... and {len(stat_features)-8} more")
    
    # Text features
    print("\n4. TEXT FEATURES:")
    essay = analyzer.reconstruct_essay(df)
    text_features = analyzer.extract_text_features(essay)
    for k, v in list(text_features.items())[:8]:  # First 8
        if isinstance(v, (int, float)):
            print(f"   {k:30s} = {v:8.3f}")
        else:
            print(f"   {k:30s} = {str(v)[:40]}")
    print(f"   ... and {len(text_features)-8} more")
    
    # Burst features
    print("\n5. BURST FEATURES:")
    burst_features = analyzer.extract_burst_features(df)
    for k, v in burst_features.items():
        print(f"   {k:30s} = {v:8.3f}")

def show_model_input_format():
    """Show exactly what format the model expects."""
    print(f"\n🤖 MODEL INPUT FORMAT")
    print("=" * 50)
    
    # Create a proper feature matrix as the model would see it
    analyzer = KeystrokeAnalyzer()
    processor = TextProcessor()
    
    with open('data/random.json', 'r') as f:
        raw_data = json.load(f)
    
    # Extract features
    features = analyzer.extract_all_features(raw_data)
    essay = features.pop('essay_text', '')
    
    # Add text processing features
    text_features = processor.process_essay_comprehensive(essay)
    text_features.pop('essay_text', None)
    features.update(text_features)
    
    # Create DataFrame (this is what goes to the model)
    feature_df = pd.DataFrame([features])
    
    print(f"Model Input DataFrame:")
    print(f"  Shape: {feature_df.shape}")
    print(f"  Columns: {feature_df.shape[1]}")
    print(f"  Data types: {feature_df.dtypes.value_counts().to_dict()}")
    
    # Handle missing values (as model would)
    feature_df_clean = feature_df.fillna(0)
    
    print(f"\nAfter cleaning (fillna(0)):")
    print(f"  Shape: {feature_df_clean.shape}")
    print(f"  No missing values: {not feature_df_clean.isnull().any().any()}")
    
    # Show feature statistics
    print(f"\nFeature Statistics:")
    stats = feature_df_clean.describe().T
    print(stats.head(10).to_string())
    
    print(f"\nReady for model prediction!")
    print(f"Feature matrix ready: {feature_df_clean.values.shape}")
    
    return feature_df_clean

def main():
    """Run the complete transformation demo."""
    print("🚀 Welcome to the Data Transformation Pipeline Demo!")
    print("This shows how your JSON keystroke data becomes model input.\n")
    
    try:
        # Show the complete pipeline
        pipeline_data = show_transformation_pipeline()
        
        # Show detailed breakdown
        show_detailed_feature_breakdown()
        
        # Show final model input format
        model_input = show_model_input_format()
        
        print(f"\n✅ TRANSFORMATION COMPLETE!")
        print(f"📋 Summary:")
        print(f"  • Raw JSON keystrokes: {len(pipeline_data['raw_data'])}")
        print(f"  • Parsed DataFrame: {pipeline_data['dataframe'].shape}")
        print(f"  • Extracted features: {len(pipeline_data['features'])}")
        print(f"  • Numeric features: {len(pipeline_data['feature_names'])}")
        print(f"  • Model input shape: {model_input.shape}")
        print(f"  • Essay reconstructed: '{pipeline_data['essay']}'")
        
        print(f"\n🎯 The feature vector is now ready for ML models!")
        print(f"   Shape: {model_input.shape}")
        print(f"   Type: {type(model_input.values)}")
        print(f"   Ready for: XGBoost, LightGBM, Neural Networks, etc.")
        
    except Exception as e:
        print(f"❌ Error in transformation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 