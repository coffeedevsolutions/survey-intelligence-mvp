# PostgreSQL Database Setup

## Prerequisites

1. **Install PostgreSQL**
   - Windows: Download from https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql` 
   - Ubuntu: `sudo apt-get install postgresql postgresql-contrib`

2. **Start PostgreSQL Service**
   - Windows: Usually starts automatically after installation
   - macOS: `brew services start postgresql`
   - Ubuntu: `sudo systemctl start postgresql`

## Database Setup

1. **Create Database**
   ```sql
   -- Connect to PostgreSQL as superuser
   psql -U postgres
   
   -- Create database
   CREATE DATABASE survey_db;
   
   -- Create user (optional, for security)
   CREATE USER survey_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE survey_db TO survey_user;
   ```

2. **Configure Environment Variables**
   ```bash
   # In the api directory, copy the example file
   cp env.example .env
   
   # Edit .env with your database credentials
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=survey_db
   DB_USER=postgres  # or survey_user if you created one
   DB_PASSWORD=your_actual_password
   ```

## Database Schema

The application will automatically create the following tables when it starts:

- **sessions**: Stores survey session data
  - `id` (VARCHAR, PRIMARY KEY)
  - `current_question_id` (VARCHAR)
  - `completed` (BOOLEAN)
  - `created_at`, `updated_at` (TIMESTAMP)

- **answers**: Stores survey responses
  - `id` (SERIAL, PRIMARY KEY)
  - `session_id` (VARCHAR, FOREIGN KEY)
  - `question_id` (VARCHAR)
  - `text` (TEXT)
  - `created_at` (TIMESTAMP)

- **facts**: Stores extracted facts from responses
  - `id` (SERIAL, PRIMARY KEY)
  - `session_id` (VARCHAR, FOREIGN KEY)
  - `key` (VARCHAR)
  - `value` (TEXT)
  - `created_at`, `updated_at` (TIMESTAMP)

## Testing the Connection

To test if everything is working:

1. Start your PostgreSQL server
2. Update your `.env` file with correct credentials
3. Run the application: `npm run dev` (from root directory)
4. Check the console for "Database initialized successfully"

## Troubleshooting

- **Connection refused**: Check if PostgreSQL is running
- **Authentication failed**: Verify username/password in .env
- **Database does not exist**: Create the database manually using psql
- **Permission denied**: Ensure the user has proper privileges

## Data Persistence

✅ **All survey data is now persisted to PostgreSQL**
- Survey sessions survive server restarts
- All answers and extracted facts are saved
- Complete audit trail with timestamps
- Relational data integrity with foreign keys
