# Project Name: Link Share Server

This is the backend server for the **DevLinks** platform. It is built with Node.js and Express.js and provides REST APIs for managing user authentication, links, and file uploads. The backend supports authentication using JWT (JSON Web Token), user profile management, and image uploads through Cloudinary.

## Installation

To install and run the project locally, follow these steps:

### 1. Clone the repository

You need to first clone the repository from your version control system.

```bash
git clone https://github.com/shakerscode/devlinks-server
cd devlinks-server
```

### 2. **Set up environment variables**:

Create a `.env` and `.env.production` file in the root of the project and configure the required environment variables (e.g., database credentials, JWT secrets). Here is an example:

```bash
PORT=5001
DB_USER=devLinks
DB_PASS=XWyUdSlUH0jymATK
CLOUDINARY_CLOUD_NAME=dmeixbxda
CLOUDINARY_API_KEY=965684965381178
CLOUDINARY_API_SECRET=hA6Ifw8evVbS1-z867kiA7IgfrU
JWT_SECRET=e7e25f41c1f8fc44af3b0d5e5b6b2b7e3077b74c9e6bc66d6e5b0b7edb2dbfc7cf0dcf9a9e35a1e4b0d4fffe8d8a5b44

```

```bash
PORT=
DB_USER=devLinks
DB_PASS=XWyUdSlUH0jymATK
CLOUDINARY_CLOUD_NAME=dmeixbxda
CLOUDINARY_API_KEY=965684965381178
CLOUDINARY_API_SECRET=hA6Ifw8evVbS1-z867kiA7IgfrU
JWT_SECRET=e7e25f41c1f8fc44af3b0d5e5b6b2b7e3077b74c9e6bc66d6e5b0b7edb2dbfc7cf0dcf9a9e35a1e4b0d4fffe8d8a5b44

```
