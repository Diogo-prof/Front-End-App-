<?php
/**
 * API Learning Platform
 * Estrutura básica da API em PHP
 */

// config/database.php
class Database {
    private $host = 'localhost';
    private $db_name = 'learning_platform';
    private $username = 'root';
    private $password = '';
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8");
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        return $this->conn;
    }
}

// models/User.php
class User {
    private $conn;
    private $table_name = "users";

    public $id;
    public $name;
    public $email;
    public $password_hash;
    public $avatar;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function login($email, $password) {
        $query = "SELECT id, name, email, password_hash FROM " . $this->table_name . " 
                  WHERE email = :email AND is_active = 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if(password_verify($password, $row['password_hash'])) {
                $this->id = $row['id'];
                $this->name = $row['name'];
                $this->email = $row['email'];
                return true;
            }
        }
        return false;
    }

    public function getDashboardData() {
        $user_id = $this->id;
        
        // Total de cursos inscritos
        $query1 = "SELECT COUNT(*) as total_courses FROM enrollments WHERE user_id = :user_id AND is_active = 1";
        $stmt1 = $this->conn->prepare($query1);
        $stmt1->bindParam(':user_id', $user_id);
        $stmt1->execute();
        $total_courses = $stmt1->fetch(PDO::FETCH_ASSOC)['total_courses'];

        // Cursos concluídos
        $query2 = "SELECT COUNT(*) as completed_courses FROM enrollments 
                   WHERE user_id = :user_id AND completed_at IS NOT NULL";
        $stmt2 = $this->conn->prepare($query2);
        $stmt2->bindParam(':user_id', $user_id);
        $stmt2->execute();
        $completed_courses = $stmt2->fetch(PDO::FETCH_ASSOC)['completed_courses'];

        // Total de vídeos disponíveis
        $query3 = "SELECT COUNT(*) as total_videos FROM videos v
                   INNER JOIN courses c ON v.course_id = c.id
                   INNER JOIN enrollments e ON c.id = e.course_id
                   WHERE e.user_id = :user_id AND v.is_published = 1";
        $stmt3 = $this->conn->prepare($query3);
        $stmt3->bindParam(':user_id', $user_id);
        $stmt3->execute();
        $total_videos = $stmt3->fetch(PDO::FETCH_ASSOC)['total_videos'];

        // Vídeos assistidos
        $query4 = "SELECT COUNT(*) as watched_videos FROM video_progress 
                   WHERE user_id = :user_id AND completed = 1";
        $stmt4 = $this->conn->prepare($query4);
        $stmt4->bindParam(':user_id', $user_id);
        $stmt4->execute();
        $watched_videos = $stmt4->fetch(PDO::FETCH_ASSOC)['watched_videos'];

        // Tempo de estudo desta semana (em horas)
        $query5 = "SELECT COALESCE(SUM(duration_seconds), 0) / 3600 as study_time 
                   FROM study_sessions 
                   WHERE user_id = :user_id AND session_start >= DATE_SUB(NOW(), INTERVAL 1 WEEK)";
        $stmt5 = $this->conn->prepare($query5);
        $stmt5->bindParam(':user_id', $user_id);
        $stmt5->execute();
        $study_time = round($stmt5->fetch(PDO::FETCH_ASSOC)['study_time']);

        return array(
            'totalCourses' => (int)$total_courses,
            'completedCourses' => (int)$completed_courses,
            'totalVideos' => (int)$total_videos,
            'watchedVideos' => (int)$watched_videos,
            'studyTime' => (int)$study_time
        );
    }
}

// models/Course.php
class Course {
    private $conn;
    private $table_name = "courses";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getUserCourses($user_id) {
        $query = "SELECT c.*, e.progress_percentage, cat.name as category_name
                  FROM courses c
                  INNER JOIN enrollments e ON c.id = e.course_id
                  INNER JOIN categories cat ON c.category_id = cat.id
                  WHERE e.user_id = :user_id AND e.is_active = 1
                  ORDER BY e.enrolled_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();

        $courses = array();
        while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $course_item = array(
                'id' => (int)$row['id'],
                'title' => $row['title'],
                'description' => $row['description'],
                'duration' => $row['duration_hours'] . ' horas',
                'level' => $row['level'],
                'progress' => (float)$row['progress_percentage'],
                'thumbnail' => $this->getEmojiByCategory($row['category_name']),
                'category' => $row['category_name']
            );
            array_push($courses, $course_item);
        }

        return $courses;
    }

    private function getEmojiByCategory($category) {
        $emojis = array(
            'Desenvolvimento Web' => '🌐',
            'Mobile Development' => '📱',
            'Ciência de Dados' => '📊',
            'Design' => '🎨'
        );
        return isset($emojis[$category]) ? $emojis[$category] : '📚';
    }
}

// models/Video.php
class Video {
    private $conn;
    private $table_name = "videos";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getUserVideos($user_id) {
        $query = "SELECT v.*, c.title as course_title, 
                         COALESCE(vp.completed, 0) as is_watched
                  FROM videos v
                  INNER JOIN courses c ON v.course_id = c.id
                  INNER JOIN enrollments e ON c.id = e.course_id
                  LEFT JOIN video_progress vp ON v.id = vp.video_id AND vp.user_id = :user_id
                  WHERE e.user_id = :user_id AND v.is_published = 1
                  ORDER BY v.published_at DESC
                  LIMIT 20";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();

        $videos = array();
        while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $video_item = array(
                'id' => (int)$row['id'],
                'title' => $row['title'],
                'description' => $row['description'],
                'duration' => $this->formatDuration($row['duration_seconds']),
                'views' => (int)$row['views'],
                'likes' => (int)$row['likes'],
                'courseId' => (int)$row['course_id'],
                'courseTitle' => $row['course_title'],
                'publishedAt' => date('Y-m-d', strtotime($row['published_at'])),
                'isWatched' => (bool)$row['is_watched']
            );
            array_push($videos, $video_item);
        }

        return $videos;
    }

    private function formatDuration($seconds) {
        $minutes = floor($seconds / 60);
        $remainingSeconds = $seconds % 60;
        return sprintf('%d:%02d', $minutes, $remainingSeconds);
    }

    public function updateProgress($user_id, $video_id, $watched_seconds, $completed = false) {
        $query = "INSERT INTO video_progress (user_id, video_id, watched_seconds, completed)
                  VALUES (:user_id, :video_id, :watched_seconds, :completed)
                  ON DUPLICATE KEY UPDATE
                  watched_seconds = :watched_seconds,
                  completed = :completed,
                  last_watched_at = NOW()";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':video_id', $video_id);
        $stmt->bindParam(':watched_seconds', $watched_seconds);
        $stmt->bindParam(':completed', $completed);
        
        return $stmt->execute();
    }
}

// api/auth.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';
include_once '../models/User.php';

$database = new Database();
$db = $database->getConnection();
$user = new User($db);

$data = json_decode(file_get_contents("php://input"));

if($_SERVER['REQUEST_METHOD'] === 'POST') {
    if(!empty($data->email) && !empty($data->password)) {
        if($user->login($data->email, $data->password)) {
            $token = base64_encode(random_bytes(32));
            
            http_response_code(200);
            echo json_encode(array(
                "message" => "Login successful",
                "token" => $token,
                "user" => array(
                    "id" => $user->id,
                    "name" => $user->name,
                    "email" => $user->email
                )
            ));
        } else {
            http_response_code(401);
            echo json_encode(array("message" => "Login failed. Invalid credentials."));
        }
    } else {
        http_response_code(400);
        echo json_encode(array("message" => "Email and password are required."));
    }
}

// api/dashboard.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';
include_once '../models/User.php';

$database = new Database();
$db = $database->getConnection();
$user = new User($db);

// Simulação de autenticação via token (implementar JWT em produção)
$headers = apache_request_headers();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : '';

if($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Para este exemplo, vamos usar user_id = 1
    $user->id = 1;
    
    $dashboard_data = $user->getDashboardData();
    
    http_response_code(200);
    echo json_encode($dashboard_data);
}

// api/courses.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';
include_once '../models/Course.php';

$database = new Database();
$db = $database->getConnection();
$course = new Course($db);

if($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Para este exemplo, vamos usar user_id = 1
    $user_id = 1;
    
    $courses = $course->getUserCourses($user_id);
    
    http_response_code(200);
    echo json_encode($courses);
}

// api/videos.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';
include_once '../models/Video.php';

$database = new Database();
$db = $database->getConnection();
$video = new Video($db);

if($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Para este exemplo, vamos usar user_id = 1
    $user_id = 1;
    
    $videos = $video->getUserVideos($user_id);
    
    http_response_code(200);
    echo json_encode($videos);
}

if($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if(!empty($data->video_id) && !empty($data->watched_seconds)) {
        $user_id = 1; // Para este exemplo
        $completed = isset($data->completed) ? $data->completed : false;
        
        if($video->updateProgress($user_id, $data->video_id, $data->watched_seconds, $completed)) {
            http_response_code(200);
            echo json_encode(array("message" => "Progress updated successfully"));
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "Failed to update progress"));
        }
    } else {
        http_response_code(400);
        echo json_encode(array("message" => "Video ID and watched seconds are required"));
    }
}

// .htaccess para URLs amigáveis
/*
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/$1.php [QSA,L]

# Headers CORS
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
*/

// composer.json para dependências (JWT, etc)
/*
{
    "require": {
        "firebase/php-jwt": "^6.0",
        "vlucas/phpdotenv": "^5.0"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    }
}
*/

?>