// firebase-config.js - Firebase Configuration
// Replace these values with your actual Firebase project configuration

window.firebaseConfig = {
    apiKey: "AIzaSyB36gEAQwwnDcLI2jONG3mZ-N9ndu-YmIE",
    authDomain: "four-in-a-row-watermelon.firebaseapp.com",
    databaseURL: "https://four-in-a-row-watermelon-default-rtdb.firebaseio.com/",
    projectId: "four-in-a-row-watermelon",
    storageBucket: "four-in-a-row-watermelon.firebasestorage.app",
    messagingSenderId: "62983592186",
    appId: "1:62983592186:web:8c1886826e93e2ce9ed143",
    measurementId: "G-XF032WKJRC"
};


/* 
SETUP INSTRUCTIONS:

1. Go to https://console.firebase.google.com/
2. Create a new project or select an existing one
3. Click on "Add app" and choose Web
4. Register your app with a nickname
5. Copy the Firebase configuration object
6. Replace the placeholder values above with your actual configuration

7. Enable Realtime Database:
   - Go to "Realtime Database" in the Firebase console
   - Click "Create Database"
   - Choose your preferred location
   - Start in "test mode" for development (configure security rules for production)

8. (Optional) Set up security rules for Realtime Database:
   {
     "rules": {
       "rooms": {
         "$roomId": {
           ".read": true,
           ".write": true,
           ".validate": "newData.hasChildren(['host', 'player1', 'board', 'currentPlayer'])"
         }
       }
     }
   }

Note: For production, implement proper authentication and more restrictive security rules.
*/