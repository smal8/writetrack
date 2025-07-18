#!/usr/bin/env python3
"""
Plagiarism Detection using Keystroke Analysis
This module analyzes typing patterns to detect potential copying behavior.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple
from datetime import datetime
import json
from keystroke_analyzer import KeystrokeAnalyzer

class PlagiarismDetector:
    """
    Detects potential plagiarism based on keystroke analysis.
    Uses typing patterns that are indicative of copying vs. original writing.
    """
    
    def __init__(self):
        self.keystroke_analyzer = KeystrokeAnalyzer()
        
        # Thresholds for suspicious behavior (these would be tuned with real data)
        self.thresholds = {
            'min_typing_speed': 3.0,  # chars/second - too fast might be copying
            'max_pause_variance': 0.5,  # low variance = uniform typing
            'min_burst_length': 10,  # long continuous typing bursts
            'max_deletion_ratio': 0.05,  # very few corrections
            'min_word_length_variance': 0.3,  # uniform word lengths
        }
    
    def analyze_copying_indicators(self, keystroke_data: List[Dict]) -> Dict[str, float]:
        """
        Analyze keystroke patterns for indicators of copying behavior.
        """
        # Extract features using the keystroke analyzer
        features = self.keystroke_analyzer.extract_all_features(keystroke_data)
        
        indicators = {}
        
        # 1. Typing Speed Analysis
        typing_speed = features.get('keys_per_second', 0)
        indicators['excessive_speed'] = min(1.0, max(0.0, (typing_speed - 2.0) / 3.0))
        
        # 2. Pause Pattern Analysis
        mean_pause = features.get('mean_pause_time', 0)
        pause_std = features.get('std_pause_time', 0)
        pause_variance = pause_std / mean_pause if mean_pause > 0 else 0
        indicators['uniform_pauses'] = max(0.0, 1.0 - pause_variance * 2)
        
        # 3. Burst Analysis (long continuous typing periods)
        burst_mean = features.get('P_bursts_mean', 0)
        indicators['long_bursts'] = min(1.0, max(0.0, (burst_mean - 5) / 10))
        
        # 4. Deletion/Correction Ratio
        total_keystrokes = features.get('activity_0_cnt', 0) + features.get('activity_1_cnt', 0)
        deletions = features.get('activity_1_cnt', 0)
        deletion_ratio = deletions / total_keystrokes if total_keystrokes > 0 else 0
        indicators['few_corrections'] = max(0.0, 1.0 - deletion_ratio * 20)
        
        # 5. Word Length Uniformity
        word_std = features.get('word_len_std', 0)
        word_mean = features.get('word_len_mean', 1)
        word_variance = word_std / word_mean if word_mean > 0 else 0
        indicators['uniform_words'] = max(0.0, 1.0 - word_variance * 3)
        
        return indicators
    
    def calculate_plagiarism_probability(self, keystroke_data: List[Dict]) -> Tuple[float, Dict]:
        """
        Calculate the probability that the text was plagiarized based on keystroke patterns.
        Returns probability (0-1) and detailed analysis.
        """
        indicators = self.analyze_copying_indicators(keystroke_data)
        features = self.keystroke_analyzer.extract_all_features(keystroke_data)
        
        # Weight the different indicators
        weights = {
            'excessive_speed': 0.25,
            'uniform_pauses': 0.20,
            'long_bursts': 0.20,
            'few_corrections': 0.20,
            'uniform_words': 0.15
        }
        
        # Calculate weighted score
        plagiarism_score = sum(indicators[key] * weights[key] for key in weights)
        
        # Additional context analysis
        essay_text = features.get('essay_text', '')
        
        analysis = {
            'plagiarism_probability': plagiarism_score,
            'confidence': self._calculate_confidence(features),
            'indicators': indicators,
            'typing_metrics': {
                'typing_speed': features.get('keys_per_second', 0),
                'mean_pause_time': features.get('mean_pause_time', 0),
                'deletion_ratio': features.get('activity_1_cnt', 0) / max(1, features.get('activity_0_cnt', 0) + features.get('activity_1_cnt', 0)),
                'word_count': features.get('word_count', 0),
                'essay_length': features.get('essay_length', 0)
            },
            'red_flags': self._identify_red_flags(indicators, features),
            'essay_text': essay_text
        }
        
        return plagiarism_score, analysis
    
    def _calculate_confidence(self, features: Dict) -> float:
        """Calculate confidence in the plagiarism assessment."""
        # More keystrokes = higher confidence
        total_keystrokes = features.get('activity_0_cnt', 0) + features.get('activity_1_cnt', 0)
        keystroke_confidence = min(1.0, total_keystrokes / 100)
        
        # Longer text = higher confidence
        text_length = features.get('essay_length', 0)
        length_confidence = min(1.0, text_length / 200)
        
        return (keystroke_confidence + length_confidence) / 2
    
    def _identify_red_flags(self, indicators: Dict, features: Dict) -> List[str]:
        """Identify specific red flags indicating potential plagiarism."""
        red_flags = []
        
        if indicators['excessive_speed'] > 0.7:
            red_flags.append("Unusually fast typing speed")
        
        if indicators['uniform_pauses'] > 0.8:
            red_flags.append("Very uniform pause patterns")
        
        if indicators['long_bursts'] > 0.6:
            red_flags.append("Extended periods of continuous typing")
        
        if indicators['few_corrections'] > 0.8:
            red_flags.append("Very few corrections or deletions")
        
        if indicators['uniform_words'] > 0.7:
            red_flags.append("Unusually uniform word lengths")
        
        # Additional checks
        deletion_ratio = features.get('activity_1_cnt', 0) / max(1, features.get('activity_0_cnt', 0) + features.get('activity_1_cnt', 0))
        if deletion_ratio < 0.02:
            red_flags.append("Extremely low error rate")
        
        return red_flags
    
    def analyze_sample_data(self, filepath: str = 'data/random.json') -> Dict:
        """Analyze the sample keystroke data for plagiarism indicators."""
        with open(filepath, 'r') as f:
            keystroke_data = json.load(f)
        
        probability, analysis = self.calculate_plagiarism_probability(keystroke_data)
        
        return {
            'plagiarism_probability_percent': probability * 100,
            'analysis': analysis,
            'recommendation': self._get_recommendation(probability, analysis['confidence'])
        }
    
    def _get_recommendation(self, probability: float, confidence: float) -> str:
        """Get a recommendation based on the plagiarism probability."""
        if confidence < 0.3:
            return "Insufficient data for reliable assessment"
        elif probability < 0.3:
            return "Low likelihood of plagiarism - appears to be original writing"
        elif probability < 0.6:
            return "Moderate suspicion - manual review recommended"
        else:
            return "High suspicion of plagiarism - further investigation needed"

def main():
    """Demo the plagiarism detection system."""
    print("=== Plagiarism Detection Demo ===\n")
    
    detector = PlagiarismDetector()
    
    try:
        # Get file path from command line arguments or use default
        import sys
        filepath = sys.argv[1] if len(sys.argv) > 1 else 'data/random.json'
        
        # Analyze the sample data
        results = detector.analyze_sample_data(filepath)
        
        print(f"📊 **Plagiarism Probability: {results['plagiarism_probability_percent']:.1f}%**\n")
        
        analysis = results['analysis']
        
        print("🔍 **Typing Analysis:**")
        metrics = analysis['typing_metrics']
        print(f"   • Typing Speed: {metrics['typing_speed']:.2f} keys/second")
        print(f"   • Mean Pause Time: {metrics['mean_pause_time']:.3f} seconds")
        print(f"   • Deletion Ratio: {metrics['deletion_ratio']:.2%}")
        print(f"   • Word Count: {metrics['word_count']}")
        print(f"   • Text Length: {metrics['essay_length']} characters")
        
        print(f"\n🎯 **Confidence: {analysis['confidence']:.2%}**")
        
        print("\n⚠️ **Plagiarism Indicators:**")
        indicators = analysis['indicators']
        for indicator, value in indicators.items():
            status = "🔴 HIGH" if value > 0.7 else "🟡 MEDIUM" if value > 0.4 else "🟢 LOW"
            print(f"   • {indicator.replace('_', ' ').title()}: {value:.2f} ({status})")
        
        if analysis['red_flags']:
            print("\n🚩 **Red Flags:**")
            for flag in analysis['red_flags']:
                print(f"   • {flag}")
        else:
            print("\n✅ **No major red flags detected**")
        
        print(f"\n📝 **Text analyzed:** '{analysis['essay_text']}'")
        
        print(f"\n💡 **Recommendation:** {results['recommendation']}")
        
        print("\n" + "="*60)
        print("Note: This is a proof-of-concept using keystroke patterns.")
        print("Real plagiarism detection would also use text similarity analysis.")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 