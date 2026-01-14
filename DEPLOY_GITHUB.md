# Деплой через GitHub и Railway (веб-интерфейс)

## Шаг 1: Создайте Git репозиторий

### Вариант A: Если у вас уже есть GitHub аккаунт

1. Зайдите на https://github.com
2. Нажмите "+" → "New repository"
3. Название: `gpt-bot` (или любое другое)
4. Выберите "Private" (если не хотите публичный репозиторий)
5. НЕ ставьте галочки на "Add README", "Add .gitignore", "Choose a license"
6. Нажмите "Create repository"

### Вариант B: Если нет GitHub аккаунта

1. Зарегистрируйтесь на https://github.com
2. Следуйте шагам из Варианта A

## Шаг 2: Залить код в GitHub

### В WSL терминале выполните:

```bash
# Перейдите в папку проекта
cd /mnt/c/Users/User/Desktop/AI_bot/gpt-bot

# Инициализируйте Git (если еще не инициализирован)
git init

# Добавьте все файлы
git add .

# Создайте первый коммит
git commit -m "Initial commit: GPT bot for Telegram"

# Добавьте удаленный репозиторий (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/gpt-bot.git

# Отправьте код на GitHub
git branch -M main
git push -u origin main
```

**Важно:** Замените `YOUR_USERNAME` на ваш реальный GitHub username!

Если Git попросит авторизацию:
- Используйте Personal Access Token вместо пароля
- Создайте токен: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
- Дайте права: `repo`

## Шаг 3: Деплой через Railway веб-интерфейс

1. Зайдите на https://railway.app
2. Войдите через GitHub (если еще не вошли)
3. Нажмите "New Project"
4. Выберите "Deploy from GitHub repo"
5. Выберите ваш репозиторий `gpt-bot`
6. Railway автоматически определит проект

## Шаг 4: Настройка переменных окружения

1. В Railway проекте перейдите в "Variables"
2. Добавьте переменные:
   - `TELEGRAM_TOKEN` = ваш токен Telegram бота
   - `GEMINI_API_KEY` = ваш ключ Gemini API
   - `GROQ_API_KEY` = ваш ключ Groq API (опционально)
   - `NODE_ENV` = `production`

## Шаг 5: Настройка деплоя

1. Перейдите в "Settings" проекта
2. Убедитесь что:
   - **Root Directory**: `gpt-bot` (если проект в подпапке репозитория) или оставьте пустым
   - **Build Command**: `npm run build` (Railway определит автоматически)
   - **Start Command**: `npm start` (Railway определит автоматически)

## Шаг 6: Деплой

Railway автоматически задеплоит проект после подключения репозитория.

Или нажмите "Deploy" вручную.

## Шаг 7: Проверка

1. Перейдите в "Deployments" → выберите последний деплой
2. Откройте "Logs"
3. Должно быть:
   - `[AI] Using Groq API for text, Gemini API for images` или `[AI] Using Gemini API`
   - Бот должен запуститься без ошибок

## Обновление проекта

После изменений в коде:

```bash
git add .
git commit -m "Описание изменений"
git push
```

Railway автоматически задеплоит обновления!

