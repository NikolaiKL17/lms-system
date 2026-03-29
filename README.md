# LMS — Система управления обучением

## Описание

Полнофункциональная система управления обучением (LMS) с двумя ролями: **Администратор** и **Студент**.

### Возможности

**Администратор:**
- Управление курсами, темами, группами, категориями
- Создание заданий (тесты и документы)
- Конструктор тестов (вопросы с изображениями, один/несколько правильных ответов)
- Управление оценками (просмотр, редактирование, пересчёт)
- Отправка на повторное выполнение
- Дашборд со статистикой
- Экспорт оценок в Excel
- Уведомления

**Студент:**
- Просмотр своих курсов и тем
- Прохождение тестов
- Загрузка ответов на задания
- Просмотр оценок
- Уведомления о новых заданиях и оценках

---

## Технологии

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Node.js, Express.js
- **БД:** MongoDB (Mongoose)
- **Аутентификация:** JWT
- **Загрузка файлов:** Multer
- **Экспорт:** ExcelJS

---

## Установка и запуск

### 1. Установите MongoDB

#### Вариант А: Локальная установка

1. Скачайте MongoDB Community Server:
   **https://www.mongodb.com/try/download/community**

2. Выберите версию для вашей ОС (Windows) и установите.

3. Во время установки:
   - Выберите **Complete** установку
   - Отметьте **Install MongoDB as a Service** (автоматический запуск)
   - Отметьте **Install MongoDB Compass** (GUI для БД)

4. После установки MongoDB автоматически запустится как служба Windows.

5. Проверьте работу — откройте терминал:
   ```
   mongosh
   ```
   Если видите приглашение `test>` — MongoDB работает.

#### Вариант Б: MongoDB Atlas (облако, бесплатно)

1. Зарегистрируйтесь на **https://www.mongodb.com/atlas**
2. Создайте бесплатный кластер (Free Tier, M0)
3. Создайте пользователя БД (Database Access → Add New Database User)
4. Разрешите доступ с вашего IP (Network Access → Add IP Address → Allow Access from Anywhere)
5. Скопируйте строку подключения (Connect → Drivers → Connection String):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/lms?retryWrites=true&w=majority
   ```
6. Вставьте эту строку в файл `.env` в поле `MONGODB_URI`

---

### 2. Установите Node.js

Скачайте и установите Node.js (версия 18+):
**https://nodejs.org/**

Проверьте:
```
node --version
npm --version
```

---

### 3. Настройте проект

```bash
# Перейдите в папку проекта
cd путь/к/проекту

# Установите зависимости
npm install

# Настройте переменные окружения
# Отредактируйте файл .env (уже создан с настройками по умолчанию)
# Если используете MongoDB Atlas — замените MONGODB_URI
# Обязательно измените JWT_SECRET на свой секретный ключ
```

Файл `.env`:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/lms
JWT_SECRET=ваш_секретный_ключ
```

---

### 4. Запустите сервер

```bash
# Обычный запуск
npm start

# Или с автоперезагрузкой (для разработки)
npm run dev
```

---

### 5. Откройте в браузере

```
http://localhost:3000
```

### Вход по умолчанию (администратор)

- **Email:** `admin@lms.com`
- **Пароль:** `admin123`

> При первом запуске администратор создаётся автоматически.

---

## Структура проекта

```
├── server.js                  # Точка входа
├── package.json               # Зависимости
├── .env                       # Переменные окружения
│
├── server/
│   ├── config/
│   │   └── db.js              # Подключение к MongoDB
│   ├── middleware/
│   │   └── auth.js            # JWT авторизация
│   ├── models/                # Mongoose модели
│   │   ├── User.js
│   │   ├── Course.js
│   │   ├── Group.js
│   │   ├── Theme.js
│   │   ├── Category.js
│   │   ├── Assignment.js
│   │   ├── Test.js
│   │   ├── Question.js
│   │   ├── Answer.js
│   │   ├── Submission.js
│   │   └── Notification.js
│   └── routes/                # API маршруты
│       ├── auth.js
│       ├── courses.js
│       ├── themes.js
│       ├── groups.js
│       ├── categories.js
│       ├── assignments.js
│       ├── tests.js
│       ├── submissions.js
│       ├── dashboard.js
│       └── notifications.js
│
├── public/                    # Фронтенд
│   ├── login.html
│   ├── admin.html
│   ├── student.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js             # API утилиты
│       ├── admin.js           # Логика админ-панели
│       └── student.js         # Логика кабинета студента
│
└── uploads/                   # Загруженные файлы
    ├── assignments/
    ├── submissions/
    └── questions/
```

---

## API Эндпоинты

### Аутентификация
| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/auth/login | Вход |
| GET | /api/auth/me | Текущий пользователь |
| POST | /api/auth/register | Регистрация (админ) |
| GET | /api/auth/users | Список пользователей |
| PUT | /api/auth/users/:id | Обновить пользователя |
| DELETE | /api/auth/users/:id | Удалить пользователя |

### Курсы
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/courses | Список курсов |
| POST | /api/courses | Создать курс |
| PUT | /api/courses/:id | Обновить курс |
| DELETE | /api/courses/:id | Удалить курс |

### Темы
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/themes/course/:id | Темы курса |
| POST | /api/themes | Создать тему |
| PUT | /api/themes/:id | Обновить тему |
| DELETE | /api/themes/:id | Удалить тему |

### Группы
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/groups | Список групп |
| POST | /api/groups | Создать группу |
| PUT | /api/groups/:id | Обновить группу |
| DELETE | /api/groups/:id | Удалить группу |
| GET | /api/groups/:id/students | Студенты группы |
| POST | /api/groups/:id/students | Добавить студента |
| DELETE | /api/groups/:id/students/:sid | Убрать студента |

### Задания
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/assignments | Список заданий |
| POST | /api/assignments | Создать задание |
| PUT | /api/assignments/:id | Обновить задание |
| DELETE | /api/assignments/:id | Удалить задание |
| POST | /api/assignments/:id/retry/:sid | Повторное выполнение |

### Тесты
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/tests/assignment/:id | Получить тест |
| POST | /api/tests/:id/questions | Добавить вопрос |
| PUT | /api/tests/questions/:id | Обновить вопрос |
| DELETE | /api/tests/questions/:id | Удалить вопрос |

### Работы студентов
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/submissions | Список работ |
| POST | /api/submissions/document | Сдать документ |
| POST | /api/submissions/test | Сдать тест |
| PUT | /api/submissions/:id/grade | Оценить работу |

### Дашборд и экспорт
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/dashboard/stats | Статистика |
| GET | /api/dashboard/student/:id | Статистика студента |
| GET | /api/dashboard/group/:id | Статистика группы |
| GET | /api/dashboard/export/:id | Экспорт в Excel |

---

## Быстрый старт (пошагово)

1. **Убедитесь что MongoDB запущена**
2. `npm install`
3. `npm start`
4. Откройте `http://localhost:3000`
5. Войдите как `admin@lms.com` / `admin123`
6. Создайте категории (Экзамен, Лабораторная, Практическая, Контрольная)
7. Создайте курс
8. Создайте группу и привяжите к курсу
9. Создайте тему внутри курса
10. Создайте студентов и добавьте в группу
11. Создайте задания (тесты или документы)
12. Студент входит и выполняет задания
