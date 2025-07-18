#!/usr/bin/env python3
"""
API interface for the writing quality prediction system.
This can be used to integrate with the existing writetrack application.
"""

import json
import os
import pickle
from typing import List, Dict, Optional
from flask import Flask, request, jsonify
from datetime import datetime
from writing_quality_model import WritingQualityPredictor

app = Flask(__name__)

# Global predictor instance
predictor = None
model_path = 'trained_model.pkl'

def initialize_predictor():
    """Initialize the predictor with pre-trained model if available."""
    global predictor
    predictor = WritingQualityPredictor()
    
    # Try to load pre-trained model
    if os.path.exists(model_path):
        try:
            predictor.load(model_path)
            print(f"Loaded pre-trained model from {model_path}")
        except Exception as e:
            print(f"Could not load pre-trained model: {e}")
            print("Predictor initialized without pre-trained model")
    else:
        print("No pre-trained model found. Predictor initialized without model.")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'model_loaded': predictor is not None and predictor.is_fitted
    })

@app.route('/predict', methods=['POST'])
def predict_writing_quality():
    """
    Predict writing quality from keystroke data.
    
    Expected input:
    {
        "keystroke_data": [
            {
                "key": "a",
                "type": "input",
                "timestamp": "2025-04-14T14:54:11.728Z"
            },
            ...
        ]
    }
    
    Returns:
    {
        "prediction": 4.2,
        "confidence": 0.85,
        "features": {...},
        "success": true
    }
    """
    try:
        if not predictor or not predictor.is_fitted:
            return jsonify({
                'error': 'Model not trained. Please train the model first.',
                'success': False
            }), 400
        
        # Get keystroke data from request
        data = request.get_json()
        if not data or 'keystroke_data' not in data:
            return jsonify({
                'error': 'Missing keystroke_data in request',
                'success': False
            }), 400
        
        keystroke_data = data['keystroke_data']
        
        # Validate keystroke data format
        if not isinstance(keystroke_data, list):
            return jsonify({
                'error': 'keystroke_data must be a list',
                'success': False
            }), 400
        
        # Make prediction
        prediction = predictor.predict(keystroke_data)
        
        # Extract features for additional insights
        features = predictor.keystroke_analyzer.extract_all_features(keystroke_data)
        essay_text = features.pop('essay_text', '')
        
        # Select interesting features to return
        interesting_features = {
            'keys_per_second': features.get('keys_per_second', 0),
            'mean_pause_time': features.get('mean_pause_time', 0),
            'word_count': features.get('word_count', 0),
            'essay_length': features.get('essay_length', 0),
            'paragraph_count': features.get('paragraph_count', 0),
            'sent_count': features.get('sent_count', 0),
            'punctuation_density': features.get('punctuation_density', 0),
            'word_diversity': features.get('word_diversity', 0)
        }
        
        # Calculate a simple confidence score (you might want to implement a more sophisticated method)
        confidence = min(0.95, max(0.5, 1.0 - abs(prediction - 3.5) / 2.5))
        
        return jsonify({
            'prediction': float(prediction),
            'confidence': float(confidence),
            'features': interesting_features,
            'essay_text': essay_text,
            'success': True
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/analyze', methods=['POST'])
def analyze_keystroke_patterns():
    """
    Analyze keystroke patterns without making a prediction.
    
    Expected input:
    {
        "keystroke_data": [...]
    }
    
    Returns detailed analysis of keystroke patterns.
    """
    try:
        # Get keystroke data from request
        data = request.get_json()
        if not data or 'keystroke_data' not in data:
            return jsonify({
                'error': 'Missing keystroke_data in request',
                'success': False
            }), 400
        
        keystroke_data = data['keystroke_data']
        
        # Analyze patterns
        analysis = analyze_keystroke_data(keystroke_data)
        
        return jsonify({
            'analysis': analysis,
            'success': True
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/train', methods=['POST'])
def train_model():
    """
    Train the model with provided data.
    
    Expected input:
    {
        "training_data": [
            {
                "keystroke_data": [...],
                "score": 4.2
            },
            ...
        ]
    }
    """
    try:
        # Get training data from request
        data = request.get_json()
        if not data or 'training_data' not in data:
            return jsonify({
                'error': 'Missing training_data in request',
                'success': False
            }), 400
        
        training_data = data['training_data']
        
        # Validate training data format
        if not isinstance(training_data, list) or len(training_data) == 0:
            return jsonify({
                'error': 'training_data must be a non-empty list',
                'success': False
            }), 400
        
        # Extract keystroke data and scores
        keystroke_data_list = []
        scores = []
        
        for item in training_data:
            if 'keystroke_data' not in item or 'score' not in item:
                return jsonify({
                    'error': 'Each training item must have keystroke_data and score',
                    'success': False
                }), 400
            
            keystroke_data_list.append(item['keystroke_data'])
            scores.append(float(item['score']))
        
        # Train the model
        global predictor
        predictor = WritingQualityPredictor()
        results = predictor.train(keystroke_data_list, scores)
        
        # Save the trained model
        predictor.save(model_path)
        
        return jsonify({
            'training_results': {
                'ensemble_score': results['ensemble_score'],
                'num_samples': len(training_data),
                'score_range': [min(scores), max(scores)]
            },
            'success': True
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/batch_predict', methods=['POST'])
def batch_predict():
    """
    Make predictions for multiple samples at once.
    
    Expected input:
    {
        "samples": [
            {"keystroke_data": [...]},
            {"keystroke_data": [...]},
            ...
        ]
    }
    """
    try:
        if not predictor or not predictor.is_fitted:
            return jsonify({
                'error': 'Model not trained. Please train the model first.',
                'success': False
            }), 400
        
        # Get samples from request
        data = request.get_json()
        if not data or 'samples' not in data:
            return jsonify({
                'error': 'Missing samples in request',
                'success': False
            }), 400
        
        samples = data['samples']
        
        # Extract keystroke data from samples
        keystroke_data_list = []
        for sample in samples:
            if 'keystroke_data' not in sample:
                return jsonify({
                    'error': 'Each sample must have keystroke_data',
                    'success': False
                }), 400
            keystroke_data_list.append(sample['keystroke_data'])
        
        # Make predictions
        predictions = predictor.predict_batch(keystroke_data_list)
        
        # Format results
        results = []
        for i, prediction in enumerate(predictions):
            # Extract basic features for each sample
            features = predictor.keystroke_analyzer.extract_all_features(keystroke_data_list[i])
            essay_text = features.pop('essay_text', '')
            
            confidence = min(0.95, max(0.5, 1.0 - abs(prediction - 3.5) / 2.5))
            
            results.append({
                'sample_id': i,
                'prediction': float(prediction),
                'confidence': float(confidence),
                'essay_length': features.get('essay_length', 0),
                'word_count': features.get('word_count', 0)
            })
        
        return jsonify({
            'results': results,
            'success': True
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

def analyze_keystroke_data(keystroke_data: List[Dict]) -> Dict:
    """Analyze keystroke data and return detailed statistics."""
    from collections import Counter
    
    # Basic statistics
    total_keystrokes = len(keystroke_data)
    input_keys = sum(1 for k in keystroke_data if k['type'] == 'input')
    delete_keys = sum(1 for k in keystroke_data if k['type'] == 'delete')
    
    # Key frequency
    key_counts = Counter(k['key'] for k in keystroke_data)
    
    # Timing analysis
    timestamps = [k['timestamp'] for k in keystroke_data]
    times = [datetime.fromisoformat(ts.replace('Z', '+00:00')) for ts in timestamps]
    intervals = [(times[i+1] - times[i]).total_seconds() for i in range(len(times)-1)]
    
    # Reconstruct text
    essay_text = ""
    for keystroke in keystroke_data:
        if keystroke['type'] == 'input':
            if keystroke['key'] == 'Space':
                essay_text += ' '
            elif keystroke['key'] == 'Enter':
                essay_text += '\n'
            elif len(keystroke['key']) == 1:
                essay_text += keystroke['key']
        elif keystroke['type'] == 'delete':
            if len(essay_text) > 0:
                essay_text = essay_text[:-1]
    
    return {
        'total_keystrokes': total_keystrokes,
        'input_keys': input_keys,
        'delete_keys': delete_keys,
        'delete_ratio': delete_keys / total_keystrokes if total_keystrokes > 0 else 0,
        'most_common_keys': dict(key_counts.most_common(10)),
        'timing': {
            'first_keystroke': timestamps[0] if timestamps else None,
            'last_keystroke': timestamps[-1] if timestamps else None,
            'mean_interval': sum(intervals) / len(intervals) if intervals else 0,
            'median_interval': sorted(intervals)[len(intervals)//2] if intervals else 0,
            'max_interval': max(intervals) if intervals else 0
        },
        'reconstructed_text': essay_text,
        'text_stats': {
            'length': len(essay_text),
            'word_count': len(essay_text.split()),
            'line_count': essay_text.count('\n') + 1
        }
    }

if __name__ == '__main__':
    # Initialize the predictor
    initialize_predictor()
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000) 