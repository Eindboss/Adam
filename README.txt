# Adam's Leeragenda — GitHub Pages + Firebase sync

## 1) Repo opzetten
- Maak (of gebruik) een GitHub repository en zet deze `index.html` in de root.
- Zet GitHub Pages aan: **Settings → Pages → Source: Deploy from a branch → main / root**.

## 2) Firebase project
- https://console.firebase.google.com → *Add project*.
- **Authentication → Sign-in method → Anonymous** (aan).
- **Firestore Database → Start in production mode**.

**Firestore regels** (Console → Firestore → Rules) — plak dit en publiceer:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /boards/{userId}/weeks/{weekId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 3) Web app toevoegen
- Firebase console → Project settings → *Your apps* → **Web app** → maak aan (zonder hosting).
- Kopieer de **Firebase config** (apiKey, authDomain, projectId…).

## 4) Config plakken
- Open `index.html` en plak je config in het aangegeven blok:
```html
<script>
  window.FIREBASE_CONFIG = {
    apiKey: "…",
    authDomain: "…",
    projectId: "…",
    storageBucket: "…",
    messagingSenderId: "…",
    appId: "…"
  };
</script>
```

## 5) Publiceren via GitHub Desktop
1. Open je repo in **GitHub Desktop**.
2. Sleep `index.html` (en desgewenst `firestore.rules`) in de repo-map.
3. Commit → Push to origin.
4. Ga naar je Pages-URL: `https://<user>.github.io/<repo>/`.

## Gebruik
- Zet rechtsboven **Cloud sync** aan. Je logt automatisch anoniem in.
- Taken worden per week realtime gesynchroniseerd.
- Werkt ook zonder sync (localStorage) als de schakelaar uit staat.

**Firestore structuur**
- `boards/{uid}/weeks/{YYYY-MM-DD}` → document met `{ tasks: [], updated: <timestamp> }`.
