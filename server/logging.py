import aiosqlite


async def init():
    async with aiosqlite.connect("server/logs/logs.db") as db:
        # Create the request_bodies table
        await db.execute(
            """CREATE TABLE IF NOT EXISTS request_bodies (
                hash TEXT PRIMARY KEY,
                content TEXT NOT NULL
            )"""
        )
        # Create the requests table
        await db.execute(
            """CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                method TEXT NOT NULL,
                path TEXT NOT NULL,
                ip TEXT NOT NULL,
                user_agent TEXT NOT NULL,
                timestamp_start INTEGER NOT NULL,
                timestamp_end INTEGER NOT NULL,
                request_duration REAL NOT NULL,
                body_hash TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                response TEXT NOT NULL,
                FOREIGN KEY (body_hash) REFERENCES request_bodies(hash)
            )"""
        )

        await db.commit()


async def log_request(
    method: str,
    path: str,
    ip: str,
    user_agent: str,
    timestamp_start: float,
    timestamp_end: float,
    body_hash: str,
    body_content: bytes,
    status_code: int,
    response: str,
):
    async with aiosqlite.connect("server/logs/logs.db") as db:
        try:
            await db.execute(
                """INSERT OR IGNORE INTO request_bodies (hash, content) VALUES (?, ?)""",
                (body_hash, body_content.decode("utf-8")),
            )
        except Exception:
            pass

        await db.execute(
            """INSERT INTO requests (
                method, path, ip, user_agent, timestamp_start, timestamp_end, request_duration, body_hash, status_code, response
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                method,
                path,
                ip,
                user_agent,
                int(timestamp_start),
                int(timestamp_end),
                timestamp_end - timestamp_start,
                body_hash,
                status_code,
                response,
            ),
        )
        await db.commit()
