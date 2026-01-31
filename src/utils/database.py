import sqlite3
import os
from datetime import datetime

class EvidenceDB:
    def __init__(self, db_path="data/pegasus.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS evidence (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    violation_type TEXT,
                    vehicle_id TEXT,
                    timestamp TEXT,
                    image_blob BLOB
                )
            """)
            conn.commit()

    def insert_evidence(self, violation_type, vehicle_id, image_bytes):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO evidence (violation_type, vehicle_id, timestamp, image_blob)
                VALUES (?, ?, ?, ?)
            """, (violation_type, vehicle_id, timestamp, image_bytes))
            conn.commit()
            return cursor.lastrowid

    def get_all_evidence(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT id, violation_type, vehicle_id, timestamp FROM evidence ORDER BY id DESC")
            return [dict(row) for row in cursor.fetchall()]

    def get_evidence_image(self, evidence_id):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT image_blob FROM evidence WHERE id = ?", (evidence_id,))
            row = cursor.fetchone()
            return row[0] if row else None

    def delete_evidence(self, ids=None):
        """Delete specific IDs or ALL if ids is None or contains 'ALL'"""
        with sqlite3.connect(self.db_path) as conn:
            if not ids or "ALL" in ids:
                conn.execute("DELETE FROM evidence")
            else:
                placeholders = ','.join(['?'] * len(ids))
                conn.execute(f"DELETE FROM evidence WHERE id IN ({placeholders})", ids)
            conn.commit()
