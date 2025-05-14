const { Client, Account } = require('node-appwrite');
const { debugLog, errorLog } = require('../utils/debugUtils');

class AuthService {
    constructor() {
        this.client = new Client()
            .setEndpoint(process.env.APPWRITE_ENDPOINT)
            .setProject(process.env.APPWRITE_PROJECT_ID);
        
        this.account = new Account(this.client);
    }

    /**
     * Benutzer mit E-Mail und Passwort einloggen
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>} Session object or null
     */
    async login(email, password) {
        try {
            debugLog(`Versuche Login für Benutzer: ${email}`);
            const session = await this.account.createEmailSession(email, password);
            debugLog('Login erfolgreich');
            return session;
        } catch (error) {
            errorLog(`Login fehlgeschlagen: ${error.message}`);
            throw error;
        }
    }

    /**
     * Benutzer ausloggen
     * @param {string} sessionId 
     */
    async logout(sessionId) {
        try {
            debugLog('Beende Session');
            await this.account.deleteSession(sessionId);
            debugLog('Logout erfolgreich');
        } catch (error) {
            errorLog(`Logout fehlgeschlagen: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verify a JWT token or session
     * @param {string} token 
     * @param {string} authType 
     * @returns {Promise<Object>} Session object or null
     */
    async verifySession(token, authType = 'jwt') {
        console.log(`\n=== Verifying ${authType.toUpperCase()} Token ===`);
        console.log('Token:', token ? `${token.substring(0, 10)}...` : 'none');

        try {
            // Set the JWT token for verification
            this.client.setJWT(token);

            // Verify by getting the current user
            console.log('Attempting token verification...');
            const user = await this.account.get();
            
            console.log('Token verification successful');
            console.log('User Info:', {
                id: user.$id,
                email: user.email,
                name: user.name
            });

            return {
                $id: user.$id,
                userId: user.$id,
                email: user.email,
                name: user.name,
                type: authType
            };
        } catch (error) {
            console.error('Token verification failed:', {
                message: error.message,
                type: authType
            });
            return null;
        } finally {
            console.log('=== Token Verification End ===\n');
        }
    }

    /**
     * Get current user information
     * @returns {Promise<Object>} User object or null
     */
    async getCurrentUser() {
        try {
            debugLog('Getting current user');
            const user = await this.account.get();
            return user;
        } catch (error) {
            errorLog(`Failed to get user: ${error.message}`);
            return null;
        }
    }
}

module.exports = AuthService; 