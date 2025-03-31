# 🧩 Blog Editor - Node.js Tech Test

## Overview

You're taking over a blog editing backend. It's functional but has subtle bugs and inconsistencies.

### Your Mission

#### 🐞 Find & Fix the Bugs

1. `POST /posts` creates posts but doesn't populate `updatedAt`
2. `PUT /posts/:id` appears to update but doesn't change `updatedAt`
3. Invalid Mongo ID in `DELETE /posts/:id` crashes the server
4. `createdAt` is inconsistently overridden vs default

#### 🛠 Add/Improve Features

5. Add `GET /posts/search?q=` for full-text search on title/content
6. Add bulk delete for posts by `tag` (e.g., `DELETE /posts?tag=js`)
7. Return `totalCount` in paginated GET response

#### 🧪 Bonus Points

- Improve error handling (standard error format)
- Other improvments as you see fit

#### Move to Production

- As we move to build this into a production product, I'd like you to detail how this could be deployed into AWS or Azure, including how the endpoints could be secured. You do not need to write any code for this; just provide a high-level description, including which cloud services you would utilize.

### Run It

A instance of mongodb is needed to run this, either a local server or mongodb atlas DB, no need to submit the DB with the test.

```bash
cp .env.example .env
npm i
npm start
```
