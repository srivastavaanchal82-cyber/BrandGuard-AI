import os
class Store:
    """Firestore when FIREBASE_CREDENTIALS is set, otherwise in-memory (data lost on restart)."""
    def __init__(self):
        self.mem, self.fs = {}, None
        path = os.getenv("FIREBASE_CREDENTIALS")
        if path:
            import firebase_admin
            from firebase_admin import credentials, firestore
            firebase_admin.initialize_app(credentials.Certificate(path))
            self.fs = firestore.client()
    @property
    def mode(self): return "firestore" if self.fs else "in-memory"
    def put(self, col, id, data):
        (self.fs.collection(col).document(id).set(data) if self.fs else self.mem.setdefault(col, {}).__setitem__(id, data))
    def get(self, col, id):
        if self.fs:
            d = self.fs.collection(col).document(id).get(); return d.to_dict() if d.exists else None
        return self.mem.get(col, {}).get(id)
    def all(self, col):
        return [d.to_dict() for d in self.fs.collection(col).stream()] if self.fs else list(self.mem.get(col, {}).values())
