-- Estrutura da Base de Dados para Learning Platform
-- MySQL/MariaDB

CREATE DATABASE IF NOT EXISTS learning_platform;
USE learning_platform;

-- Tabela de utilizadores
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabela de categorias de cursos
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de cursos
CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(255),
    duration_hours INT DEFAULT 0,
    level ENUM('Iniciante', 'Intermediario', 'Avancado') DEFAULT 'Iniciante',
    category_id INT,
    instructor_id INT,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- Tabela de videos/licoes
CREATE TABLE videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    video_url VARCHAR(500),
    thumbnail VARCHAR(255),
    duration_seconds INT DEFAULT 0,
    order_index INT DEFAULT 0,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Tabela de inscricoes dos utilizadores nos cursos
CREATE TABLE enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    completed_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (user_id, course_id)
);

-- Tabela de progresso dos videos assistidos
CREATE TABLE video_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    video_id INT NOT NULL,
    watched_seconds INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_progress (user_id, video_id)
);

-- Tabela de sessoes de estudo (para estatisticas)
CREATE TABLE study_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    video_id INT NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP NULL,
    duration_seconds INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Tabela de avaliacoes/reviews dos cursos
CREATE TABLE course_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    rating TINYINT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (user_id, course_id)
);

-- Indices para melhorar performance
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_videos_course ON videos(course_id);
CREATE INDEX idx_videos_published ON videos(is_published, published_at);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_video_progress_user ON video_progress(user_id);
CREATE INDEX idx_study_sessions_user ON study_sessions(user_id);

-- Inserir dados de exemplo
INSERT INTO categories (name, description, icon) VALUES
('Desenvolvimento Web', 'Cursos sobre desenvolvimento frontend e backend', '🌐'),
('Mobile Development', 'Desenvolvimento de aplicacoes moveis', '📱'),
('Ciencia de Dados', 'Analise de dados e machine learning', '📊'),
('Design', 'UI/UX Design e ferramentas graficas', '🎨');

INSERT INTO users (name, email, password_hash) VALUES
('Admin User', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('Joao Silva', 'joao@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('Maria Santos', 'maria@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

INSERT INTO courses (title, description, thumbnail, duration_hours, level, category_id, instructor_id, is_published) VALUES
('Desenvolvimento Web Completo', 'Aprenda HTML, CSS, JavaScript e frameworks modernos', 'https://via.placeholder.com/400x200', 40, 'Iniciante', 1, 1, TRUE),
('React e React Native', 'Desenvolvimento mobile e web com React', 'https://via.placeholder.com/400x200', 35, 'Intermediario', 2, 1, TRUE),
('Node.js e APIs', 'Backend e desenvolvimento de APIs RESTful', 'https://via.placeholder.com/400x200', 30, 'Intermediario', 1, 1, TRUE),
('Python para Ciencia de Dados', 'Analise de dados e machine learning', 'https://via.placeholder.com/400x200', 45, 'Avancado', 3, 1, TRUE);

INSERT INTO videos (course_id, title, description, duration_seconds, order_index, views, likes, is_published, published_at) VALUES
(1, 'Introducao ao HTML5', 'Nesta aula voce aprendera os fundamentos do HTML5', 930, 1, 1234, 89, TRUE, '2024-01-15 10:00:00'),
(1, 'CSS Grid Layout', 'Domine o CSS Grid e crie layouts complexos', 1365, 2, 987, 76, TRUE, '2024-01-18 10:00:00'),
(1, 'JavaScript ES6+', 'Explore as funcionalidades modernas do JavaScript', 1692, 3, 1567, 123, TRUE, '2024-01-20 10:00:00'),
(2, 'Introducao ao React', 'Conceitos basicos do React', 1200, 1, 890, 65, TRUE, '2024-01-22 10:00:00'),
(2, 'Componentes e Props', 'Criando componentes reutilizaveis', 1500, 2, 756, 54, TRUE, '2024-01-25 10:00:00');

INSERT INTO enrollments (user_id, course_id, progress_percentage) VALUES
(1, 1, 75.0),
(1, 2, 40.0),
(1, 3, 20.0),
(2, 1, 30.0),
(2, 4, 15.0);

INSERT INTO video_progress (user_id, video_id, watched_seconds, completed) VALUES
(1, 1, 930, TRUE),
(1, 2, 1365, TRUE),
(1, 3, 800, FALSE),
(2, 1, 450, FALSE);