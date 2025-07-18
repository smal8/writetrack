import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from sklearn.model_selection import StratifiedKFold, KFold, cross_val_score
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.decomposition import PCA
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.svm import SVR
from sklearn.neural_network import MLPRegressor
from sklearn.naive_bayes import MultinomialNB
import xgboost as xgb
import lightgbm as lgb
from scipy.optimize import minimize
import warnings
warnings.filterwarnings('ignore')

class WritingQualityModel:
    """
    Comprehensive model pipeline for writing quality assessment.
    Implements multiple models and ensemble methods.
    """
    
    def __init__(self):
        self.models = {}
        self.ensemble_weights = {}
        self.scalers = {}
        self.is_fitted = False
        self.feature_names = []
        
        # Score mapping (as per the notebook)
        self.score_mapping = {
            6.0: 1, 5.5: 1, 5.0: 4, 4.5: 7, 4.0: 9, 
            3.5: 8, 3.0: 6, 2.5: 5, 2.0: 3, 1.5: 2, 1.0: 0, 0.5: 0
        }
        
        # Inverse mapping for predictions
        self.inverse_mapping = {
            0: 1.0, 1: 6.0, 2: 1.5, 3: 2.0, 4: 5.0, 
            5: 2.5, 6: 3.0, 7: 4.5, 8: 3.5, 9: 4.0
        }
        
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize all models with their configurations."""
        
        # XGBoost Regressor
        self.models['xgb'] = xgb.XGBRegressor(
            n_estimators=1000,
            learning_rate=0.01,
            max_depth=4,
            subsample=0.3,
            objective='reg:squarederror',
            random_state=42
        )
        
        # LightGBM Regressor
        self.models['lgb'] = lgb.LGBMRegressor(
            n_estimators=1000,
            learning_rate=0.01,
            max_depth=4,
            subsample=0.3,
            random_state=42,
            verbose=-1
        )
        
        # Linear Models
        self.models['linear_svr'] = SVR(C=0.9, kernel='linear')
        self.models['elastic_net'] = ElasticNet(alpha=0.001, l1_ratio=0.5, random_state=42)
        self.models['ridge'] = Ridge(alpha=10)
        self.models['lasso'] = Lasso(alpha=0.001, random_state=42)
        
        # Neural Network
        self.models['mlp'] = MLPRegressor(
            hidden_layer_sizes=(100, 50),
            max_iter=500,
            random_state=42,
            early_stopping=True
        )
        
        # Gradient Boosting
        self.models['gb'] = GradientBoostingRegressor(
            n_estimators=500,
            learning_rate=0.01,
            max_depth=4,
            random_state=42
        )
        
        # Random Forest
        self.models['rf'] = RandomForestRegressor(
            n_estimators=500,
            max_depth=10,
            random_state=42
        )
        
        # Initialize scalers for each model
        for model_name in self.models.keys():
            self.scalers[model_name] = StandardScaler()
    
    def _scale_features(self, X: np.ndarray, model_name: str, fit: bool = False) -> np.ndarray:
        """Scale features for a specific model."""
        if model_name in ['linear_svr', 'elastic_net', 'ridge', 'lasso', 'mlp']:
            if fit:
                return self.scalers[model_name].fit_transform(X)
            else:
                return self.scalers[model_name].transform(X)
        else:
            # Tree-based models don't need scaling
            return X
    
    def _prepare_features(self, X: pd.DataFrame) -> np.ndarray:
        """Prepare features for model training."""
        # Handle missing values
        X_filled = X.fillna(0)
        
        # Store feature names
        if not self.feature_names:
            self.feature_names = list(X_filled.columns)
        
        return X_filled.values
    
    def train_single_model(self, X: np.ndarray, y: np.ndarray, model_name: str, 
                          cv_folds: int = 5) -> Tuple[np.ndarray, float]:
        """Train a single model with cross-validation."""
        model = self.models[model_name]
        
        # Prepare cross-validation
        kf = KFold(n_splits=cv_folds, shuffle=True, random_state=42)
        oof_predictions = np.zeros(len(X))
        
        for train_idx, val_idx in kf.split(X):
            # Split data
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]
            
            # Scale features
            X_train_scaled = self._scale_features(X_train, model_name, fit=True)
            X_val_scaled = self._scale_features(X_val, model_name, fit=False)
            
            # Train model
            model.fit(X_train_scaled, y_train)
            
            # Predict
            val_predictions = model.predict(X_val_scaled)
            oof_predictions[val_idx] = val_predictions
        
        # Calculate CV score
        cv_score = mean_squared_error(y, oof_predictions, squared=False)
        
        return oof_predictions, cv_score
    
    def train_ensemble(self, X: pd.DataFrame, y: np.ndarray, cv_folds: int = 5) -> Dict[str, Any]:
        """Train all models and create ensemble."""
        X_array = self._prepare_features(X)
        
        # Store training results
        oof_predictions = {}
        cv_scores = {}
        
        print("Training individual models...")
        for model_name in self.models.keys():
            print(f"Training {model_name}...")
            oof_pred, cv_score = self.train_single_model(X_array, y, model_name, cv_folds)
            oof_predictions[model_name] = oof_pred
            cv_scores[model_name] = cv_score
            print(f"{model_name} CV RMSE: {cv_score:.4f}")
        
        # Find best models for ensemble
        best_models = sorted(cv_scores.items(), key=lambda x: x[1])[:5]  # Top 5 models
        
        # Create ensemble weights
        print("\nOptimizing ensemble weights...")
        self.ensemble_weights = self._optimize_ensemble_weights(
            oof_predictions, y, [model[0] for model in best_models]
        )
        
        # Final ensemble prediction
        ensemble_pred = self._create_ensemble_prediction(
            oof_predictions, self.ensemble_weights
        )
        
        ensemble_score = mean_squared_error(y, ensemble_pred, squared=False)
        
        print(f"\nEnsemble CV RMSE: {ensemble_score:.4f}")
        print(f"Ensemble weights: {self.ensemble_weights}")
        
        # Train final models on full data
        print("\nTraining final models on full data...")
        for model_name in self.models.keys():
            X_scaled = self._scale_features(X_array, model_name, fit=True)
            self.models[model_name].fit(X_scaled, y)
        
        self.is_fitted = True
        
        return {
            'oof_predictions': oof_predictions,
            'cv_scores': cv_scores,
            'ensemble_weights': self.ensemble_weights,
            'ensemble_score': ensemble_score
        }
    
    def _optimize_ensemble_weights(self, oof_predictions: Dict[str, np.ndarray], 
                                  y: np.ndarray, model_names: List[str]) -> Dict[str, float]:
        """Optimize ensemble weights using scipy minimize."""
        
        def objective(weights):
            ensemble_pred = np.zeros(len(y))
            for i, model_name in enumerate(model_names):
                ensemble_pred += weights[i] * oof_predictions[model_name]
            return mean_squared_error(y, ensemble_pred, squared=False)
        
        # Initial weights
        initial_weights = [1.0 / len(model_names)] * len(model_names)
        
        # Constraints: weights sum to 1
        constraints = ({'type': 'eq', 'fun': lambda w: sum(w) - 1})
        
        # Bounds: weights between 0 and 1
        bounds = [(0, 1) for _ in range(len(model_names))]
        
        # Optimize
        result = minimize(objective, initial_weights, method='SLSQP', 
                         bounds=bounds, constraints=constraints)
        
        # Create weights dictionary
        weights = {}
        for i, model_name in enumerate(model_names):
            weights[model_name] = result.x[i]
        
        return weights
    
    def _create_ensemble_prediction(self, predictions: Dict[str, np.ndarray], 
                                   weights: Dict[str, float]) -> np.ndarray:
        """Create ensemble prediction using weights."""
        ensemble_pred = np.zeros(len(next(iter(predictions.values()))))
        
        for model_name, weight in weights.items():
            if model_name in predictions:
                ensemble_pred += weight * predictions[model_name]
        
        return ensemble_pred
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Make predictions using the ensemble."""
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        X_array = self._prepare_features(X)
        
        # Get predictions from all models
        predictions = {}
        for model_name, model in self.models.items():
            X_scaled = self._scale_features(X_array, model_name, fit=False)
            predictions[model_name] = model.predict(X_scaled)
        
        # Create ensemble prediction
        ensemble_pred = self._create_ensemble_prediction(predictions, self.ensemble_weights)
        
        # Clip predictions to valid range
        ensemble_pred = np.clip(ensemble_pred, 0.5, 6.0)
        
        return ensemble_pred
    
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Get prediction probabilities for classification models."""
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        # Convert regression predictions to classification probabilities
        predictions = self.predict(X)
        
        # Convert to classification format
        prob_matrix = np.zeros((len(predictions), len(self.score_mapping)))
        
        for i, pred in enumerate(predictions):
            # Find closest score
            closest_score = min(self.score_mapping.keys(), key=lambda x: abs(x - pred))
            class_idx = self.score_mapping[closest_score]
            prob_matrix[i, class_idx] = 1.0
        
        return prob_matrix
    
    def feature_importance(self, top_n: int = 20) -> pd.DataFrame:
        """Get feature importance from tree-based models."""
        if not self.is_fitted:
            raise ValueError("Model must be fitted to get feature importance")
        
        importance_data = []
        
        # Get importance from tree-based models
        for model_name in ['xgb', 'lgb', 'rf', 'gb']:
            if model_name in self.models:
                model = self.models[model_name]
                
                if hasattr(model, 'feature_importances_'):
                    importances = model.feature_importances_
                elif hasattr(model, 'coef_'):
                    importances = np.abs(model.coef_)
                else:
                    continue
                
                for i, importance in enumerate(importances):
                    importance_data.append({
                        'model': model_name,
                        'feature': self.feature_names[i] if i < len(self.feature_names) else f'feature_{i}',
                        'importance': importance
                    })
        
        # Create DataFrame and aggregate
        df = pd.DataFrame(importance_data)
        if len(df) > 0:
            feature_importance = df.groupby('feature')['importance'].mean().sort_values(ascending=False)
            return feature_importance.head(top_n).to_frame('importance')
        else:
            return pd.DataFrame()
    
    def evaluate_model(self, X: pd.DataFrame, y: np.ndarray) -> Dict[str, float]:
        """Evaluate model performance."""
        predictions = self.predict(X)
        
        return {
            'rmse': mean_squared_error(y, predictions, squared=False),
            'mae': mean_absolute_error(y, predictions),
            'r2': 1 - (np.sum((y - predictions) ** 2) / np.sum((y - np.mean(y)) ** 2))
        }
    
    def save_model(self, filepath: str):
        """Save the trained model."""
        import pickle
        
        model_data = {
            'models': self.models,
            'ensemble_weights': self.ensemble_weights,
            'scalers': self.scalers,
            'feature_names': self.feature_names,
            'is_fitted': self.is_fitted,
            'score_mapping': self.score_mapping,
            'inverse_mapping': self.inverse_mapping
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
    
    def load_model(self, filepath: str):
        """Load a saved model."""
        import pickle
        
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.models = model_data['models']
        self.ensemble_weights = model_data['ensemble_weights']
        self.scalers = model_data['scalers']
        self.feature_names = model_data['feature_names']
        self.is_fitted = model_data['is_fitted']
        self.score_mapping = model_data['score_mapping']
        self.inverse_mapping = model_data['inverse_mapping']


class WritingQualityPredictor:
    """
    Complete pipeline for writing quality prediction from keystroke data.
    """
    
    def __init__(self):
        from keystroke_analyzer import KeystrokeAnalyzer
        from text_processor import TextProcessor
        
        self.keystroke_analyzer = KeystrokeAnalyzer()
        self.text_processor = TextProcessor()
        self.model = WritingQualityModel()
        self.is_fitted = False
    
    def prepare_features(self, keystroke_data_list: List[List[Dict]]) -> pd.DataFrame:
        """Prepare features from keystroke data."""
        all_features = []
        essays = []
        
        for keystroke_data in keystroke_data_list:
            # Extract basic features
            features = self.keystroke_analyzer.extract_all_features(keystroke_data)
            essay = features.pop('essay_text', '')
            essays.append(essay)
            
            # Add text processing features
            text_features = self.text_processor.process_essay_comprehensive(essay)
            text_features.pop('essay_text', None)
            features.update(text_features)
            
            all_features.append(features)
        
        # Create DataFrame
        df = pd.DataFrame(all_features)
        
        # Add advanced text features if we have multiple essays
        if len(essays) > 1:
            try:
                advanced_features = self.text_processor.create_advanced_features(essays)
                
                # Add n-gram features
                for i in range(advanced_features['ngram_char_1_4'].shape[1]):
                    df[f'ngram_char_{i}'] = advanced_features['ngram_char_1_4'][:, i]
                
                # Add topic features
                for i in range(advanced_features['topics_word'].shape[1]):
                    df[f'topic_word_{i}'] = advanced_features['topics_word'][:, i]
                
                # Add PCA features
                for i in range(advanced_features['pca_100'].shape[1]):
                    df[f'pca_{i}'] = advanced_features['pca_100'][:, i]
                
                # Add t-SNE features
                for i in range(advanced_features['tsne_20'].shape[1]):
                    df[f'tsne_20_{i}'] = advanced_features['tsne_20'][:, i]
                
            except Exception as e:
                print(f"Warning: Could not add advanced features: {e}")
        
        return df
    
    def train(self, keystroke_data_list: List[List[Dict]], scores: List[float]) -> Dict[str, Any]:
        """Train the complete pipeline."""
        print("Preparing features...")
        X = self.prepare_features(keystroke_data_list)
        y = np.array(scores)
        
        print("Training model...")
        results = self.model.train_ensemble(X, y)
        
        self.is_fitted = True
        return results
    
    def predict(self, keystroke_data: List[Dict]) -> float:
        """Predict writing quality score from keystroke data."""
        if not self.is_fitted:
            raise ValueError("Model must be trained before making predictions")
        
        # Prepare features
        X = self.prepare_features([keystroke_data])
        
        # Make prediction
        prediction = self.model.predict(X)[0]
        
        return prediction
    
    def predict_batch(self, keystroke_data_list: List[List[Dict]]) -> List[float]:
        """Predict writing quality scores for multiple samples."""
        if not self.is_fitted:
            raise ValueError("Model must be trained before making predictions")
        
        # Prepare features
        X = self.prepare_features(keystroke_data_list)
        
        # Make predictions
        predictions = self.model.predict(X)
        
        return predictions.tolist()
    
    def save(self, filepath: str):
        """Save the complete pipeline."""
        self.model.save_model(filepath)
    
    def load(self, filepath: str):
        """Load the complete pipeline."""
        self.model.load_model(filepath)
        self.is_fitted = True 