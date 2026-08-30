import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const appId = typeof __app_id !== 'undefined'
    ? __app_id
    : 'concert-support-map';

const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyAhjvu_SHZJUkJYTyXEaBA5HZfGdvObfIY",
        authDomain: "fan-map-68117.firebaseapp.com",
        projectId: "fan-map-68117",
        storageBucket: "fan-map-68117.firebasestorage.app",
        messagingSenderId: "1066740158853",
        appId: "1:1066740158853:web:1ea5f5283c20fed067f4ec",
        measurementId: "G-NYL7N1MX39"
    };

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export {
    app,
    appId,
    db,
    auth,
    storage
};