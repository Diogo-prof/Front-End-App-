// services/api.js
// Configuração da API para integração com o backend PHP

class ApiService {
    constructor() {
        this.baseUrl = 'http://localhost/learning-platform/api';
        this.token = localStorage.getItem('auth_token');
    }

    // Configuração dos headers para as requisições
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Método para fazer requisições HTTP
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Autenticação
    async login(email, password) {
        const response = await this.request('/auth', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (response.token) {
            this.token = response.token;
            localStorage.setItem('auth_token', this.token);
        }

        return response;
    }

    // Logout
    logout() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    // Dashboard
    async getDashboardData() {
        return await this.request('/dashboard');
    }

    // Cursos
    async getCourses() {
        return await this.request('/courses');
    }

    // Vídeos
    async getVideos() {
        return await this.request('/videos');
    }

    // Atualizar progresso do vídeo
    async updateVideoProgress(videoId, watchedSeconds, completed = false) {
        return await this.request('/videos', {
            method: 'POST',
            body: JSON.stringify({
                video_id: videoId,
                watched_seconds: watchedSeconds,
                completed: completed
            }),
        });
    }

    // Verificar se há token válido
    isAuthenticated() {
        return !!this.token;
    }
}

// Instância única da API
export const apiService = new ApiService();

// hooks/useApi.js
// Custom hooks para gerenciar estados da API

import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

// Hook para autenticação
export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = async (email, password) => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.login(email, password);
            setUser(response.user);
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        apiService.logout();
        setUser(null);
    };

    useEffect(() => {
        // Verificar se há token ao carregar
        if (apiService.isAuthenticated()) {
            // Aqui você poderia fazer uma requisição para validar o token
            // Por simplicidade, vamos assumir que está válido
        }
    }, []);

    return { user, loading, error, login, logout };
};

// Hook para dashboard
export const useDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const dashboardData = await apiService.getDashboardData();
            setData(dashboardData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    return { data, loading, error, refetch: fetchDashboard };
};

// Hook para cursos
export const useCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const coursesData = await apiService.getCourses();
            setCourses(coursesData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    return { courses, loading, error, refetch: fetchCourses };
};

// Hook para vídeos
export const useVideos = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchVideos = async () => {
        try {
            setLoading(true);
            const videosData = await apiService.getVideos();
            setVideos(videosData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateProgress = async (videoId, watchedSeconds, completed = false) => {
        try {
            await apiService.updateVideoProgress(videoId, watchedSeconds, completed);
            // Atualizar o estado local se necessário
            setVideos(prev => prev.map(video => 
                video.id === videoId 
                    ? { ...video, isWatched: completed }
                    : video
            ));
        } catch (err) {
            console.error('Erro ao atualizar progresso:', err);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    return { videos, loading, error, refetch: fetchVideos, updateProgress };
};

// components/ApiIntegratedApp.jsx
// Versão da aplicação integrada com a API real

import React from 'react';
import { useAuth, useDashboard, useCourses, useVideos } from './hooks/useApi';

// Componente de Login integrado
function LoginScreen() {
    const { login, loading, error } = useAuth();
    const [email, setEmail] = useState('admin@example.com');
    const [password, setPassword] = useState('password');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            // Usuário será redirecionado automaticamente pelo estado do useAuth
        } catch (err) {
            // Erro já está sendo tratado pelo hook
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="logo">
                    <h1>📚</h1>
                    <p>Learning Platform</p>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Digite seu email"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Digite sua senha"
                            required
                        />
                    </div>
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Dashboard integrado
function Dashboard() {
    const { data, loading, error } = useDashboard();

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Carregando dashboard...</p>
            </div>
        );
    }

    if (error) {
        return <div className="error-message">Erro: {error}</div>;
    }

    return (
        <div>
            <h2 style={{marginBottom: '20px', color: '#333'}}>Dashboard</h2>
            
            <div className="dashboard-cards">
                <div className="card">
                    <div className="card-header">
                        <div className="card-icon primary">
                            <i className="fas fa-book"></i>
                        </div>
                        <div>
                            <div className="card-title">Total de Cursos</div>
                        </div>
                    </div>
                    <div className="card-value">{data.totalCourses}</div>
                    <p style={{color: '#666', fontSize: '0.9rem'}}>
                        {data.completedCourses} concluídos
                    </p>
                </div>
                
                <div className="card">
                    <div className="card-header">
                        <div className="card-icon success">
                            <i className="fas fa-play"></i>
                        </div>
                        <div>
                            <div className="card-title">Vídeos</div>
                        </div>
                    </div>
                    <div className="card-value">{data.totalVideos}</div>
                    <p style={{color: '#666', fontSize: '0.9rem'}}>
                        {data.watchedVideos} assistidos
                    </p>
                </div>
                
                <div className="card">
                    <div className="card-header">
                        <div className="card-icon warning">
                            <i className="fas fa-clock"></i>
                        </div>
                        <div>
                            <div className="card-title">Tempo de Estudo</div>
                        </div>
                    </div>
                    <div className="card-value">{data.studyTime}h</div>
                    <p style={{color: '#666', fontSize: '0.9rem'}}>Esta semana</p>
                </div>
            </div>
        </div>
    );
}

// Biblioteca integrada
function Library() {
    const { courses, loading, error } = useCourses();

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Carregando biblioteca...</p>
            </div>
        );
    }

    if (error) {
        return <div className="error-message">Erro: {error}</div>;
    }

    return (
        <div>
            <h2 style={{marginBottom: '20px', color: '#333'}}>Biblioteca de Cursos</h2>
            
            <div className="library-grid">
                {courses.map(course => (
                    <div key={course.id} className="course-card">
                        <div className="course-thumbnail">
                            {course.thumbnail}
                        </div>
                        <div className="course-info">
                            <h3 className="course-title">{course.title}</h3>
                            <p className="course-description">{course.description}</p>
                            
                            <div className="course-meta">
                                <span className="course-duration">
                                    <i className="fas fa-clock"></i> {course.duration}
                                </span>
                                <span className="course-level">{course.level}</span>
                            </div>
                            
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill" 
                                    style={{width: `${course.progress}%`}}
                                ></div>
                            </div>
                            <p style={{color: '#666', fontSize: '0.8rem', marginTop: '5px'}}>
                                {Math.round(course.progress)}% concluído
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Vídeos integrados
function Videos() {
    const { videos, loading, error, updateProgress } = useVideos();
    const [selectedVideo, setSelectedVideo] = useState(null);

    useEffect(() => {
        if (videos.length > 0 && !selectedVideo) {
            setSelectedVideo(videos[0]);
        }
    }, [videos, selectedVideo]);

    const handleVideoSelect = (video) => {
        setSelectedVideo(video);
        // Simular que o usuário assistiu alguns segundos
        updateProgress(video.id, 30, false);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Carregando vídeos...</p>
            </div>
        );
    }

    if (error) {
        return <div className="error-message">Erro: {error}</div>;
    }

    return (
        <div>
            <h2 style={{marginBottom: '20px', color: '#333'}}>Reprodução de Vídeo</h2>
            
            {selectedVideo && (
                <div style={{marginBottom: '30px'}}>
                    <div className="video-player">
                        <div className="play-button" onClick={() => updateProgress(selectedVideo.id, 300, true)}>
                            <i className="fas fa-play"></i>
                        </div>
                    </div>
                    
                    <div className="video-info">
                        <h3 className="video-title">{selectedVideo.title}</h3>
                        <p className="video-description">{selectedVideo.description}</p>
                        
                        <div className="video-meta">
                            <div className="meta-item">
                                <i className="fas fa-clock"></i>
                                <span>{selectedVideo.duration}</span>
                            </div>
                            <div className="meta-item">
                                <i className="fas fa-eye"></i>
                                <span>{selectedVideo.views} visualizações</span>
                            </div>
                            <div className="meta-item">
                                <i className="fas fa-thumbs-up"></i>
                                <span>{selectedVideo.likes} likes</span>
                            </div>
                            <div className="meta-item">
                                <i className="fas fa-calendar"></i>
                                <span>{selectedVideo.publishedAt}</span>
                            </div>
                        </div>
                        
                        {selectedVideo.isWatched && (
                            <div style={{color: '#4CAF50', marginTop: '10px'}}>
                                <i className="fas fa-check"></i> Vídeo assistido
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <h3 style={{marginBottom: '20px', color: '#333'}}>Outros Vídeos</h3>
            <div className="library-grid">
                {videos.map(video => (
                    <div 
                        key={video.id} 
                        className="course-card"
                        onClick={() => handleVideoSelect(video)}
                        style={{cursor: 'pointer', opacity: video.isWatched ? 0.8 : 1}}
                    >
                        <div className="course-thumbnail">
                            <i className="fas fa-play" style={{fontSize: '2rem'}}></i>
                            {video.isWatched && (
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    background: '#4CAF50',
                                    borderRadius: '50%',
                                    width: '25px',
                                    height: '25px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <i className="fas fa-check" style={{fontSize: '0.8rem'}}></i>
                                </div>
                            )}
                        </div>
                        <div className="course-info">
                            <h3 className="course-title">{video.title}</h3>
                            <p className="course-description" style={{fontSize: '0.85rem'}}>
                                {video.description.substring(0, 100)}...
                            </p>
                            <p style={{color: '#888', fontSize: '0.8rem', marginBottom: '10px'}}>
                                Curso: {video.courseTitle}
                            </p>
                            
                            <div className="course-meta">
                                <span className="course-duration">
                                    <i className="fas fa-clock"></i> {video.duration}
                                </span>
                                <span className="course-duration">
                                    <i className="fas fa-eye"></i> {video.views}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Aplicação principal integrada
function ApiIntegratedApp() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');

    if (!user) {
        return <LoginScreen />;
    }

    const handleLogout = () => {
        logout();
        setActiveTab('dashboard');
    };

    const renderContent = () => {
        switch(activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'library':
                return <Library />;
            case 'videos':
                return <Videos />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="app-container">
            <div className="main-layout">
                <header className="header">
                    <div className="header-logo">📚 Learning</div>
                    <div className="user-info">
                        <div className="avatar">
                            {user.name.charAt(0)}
                        </div>
                        <span style={{color: '#333', fontWeight: '500'}}>{user.name}</span>
                        <button 
                            onClick={handleLogout}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#667eea',
                                cursor: 'pointer',
                                marginLeft: '10px'
                            }}
                        >
                            <i className="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </header>

                <div className="content">
                    {renderContent()}
                </div>

                <nav className="bottom-nav">
                    <div 
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <i className="fas fa-home"></i>
                        <span>Dashboard</span>
                    </div>
                    <div 
                        className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
                        onClick={() => setActiveTab('library')}
                    >
                        <i className="fas fa-book"></i>
                        <span>Biblioteca</span>
                    </div>
                    <div 
                        className={`nav-item ${activeTab === 'videos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('videos')}
                    >
                        <i className="fas fa-play"></i>
                        <span>Vídeos</span>
                    </div>
                    <div className="nav-item">
                        <i className="fas fa-user"></i>
                        <span>Perfil</span>
                    </div>
                </nav>
            </div>
        </div>
    );
}

export default ApiIntegratedApp;