/**
 * CryptoSteg - Encryption Module
 * Handles text encryption and decryption using various algorithms
 */

class Encryption {
    /**
     * Encrypts text using the selected algorithm
     * @param {string} text - Text to encrypt
     * @param {string} key - Encryption key or password
     * @param {string} algorithm - Encryption algorithm to use
     * @param {string} outputFormat - Output format (base64 or hex)
     * @param {object} options - Additional options (e.g., caesarShift)
     * @returns {string} Encrypted text
     */
    encrypt(text, key, algorithm, outputFormat = 'base64', options = {}) {
        if (!text) {
            throw new Error('Please enter text to encrypt');
        }
        
        if (!key && algorithm !== 'caesar') {
            throw new Error('Please enter an encryption key');
        }
        
        try {
            let encrypted;
            
            switch (algorithm) {
                case 'aes':
                    encrypted = CryptoJS.AES.encrypt(text, key);
                    break;
                    
                case 'des':
                    encrypted = CryptoJS.DES.encrypt(text, key);
                    break;
                    
                case 'tripledes':
                    encrypted = CryptoJS.TripleDES.encrypt(text, key);
                    break;
                    
                case 'rabbit':
                    encrypted = CryptoJS.Rabbit.encrypt(text, key);
                    break;
                    
                case 'rc4':
                    encrypted = CryptoJS.RC4.encrypt(text, key);
                    break;
                    
                case 'caesar':
                    const shift = options.caesarShift || 3;
                    return this.caesarCipher(text, shift);
                    
                default:
                    throw new Error('Unknown encryption algorithm');
            }
            
            // Format the output
            if (outputFormat === 'hex') {
                return encrypted.ciphertext.toString();
            } else {
                return encrypted.toString();
            }
            
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }
    
    /**
     * Decrypts text using the selected algorithm
     * @param {string} encryptedText - Text to decrypt
     * @param {string} key - Decryption key or password
     * @param {string} algorithm - Decryption algorithm to use
     * @param {string} inputFormat - Input format (base64 or hex)
     * @param {object} options - Additional options (e.g., caesarShift)
     * @returns {string} Decrypted text
     */
    decrypt(encryptedText, key, algorithm, inputFormat = 'base64', options = {}) {
        if (!encryptedText) {
            throw new Error('Please enter text to decrypt');
        }
        
        if (!key && algorithm !== 'caesar') {
            throw new Error('Please enter a decryption key');
        }
        
        try {
            let decrypted;
            
            // Handle Caesar cipher separately
            if (algorithm === 'caesar') {
                const shift = options.caesarShift || 3;
                return this.caesarDecipher(encryptedText, shift);
            }
            
            // For other algorithms, prepare the ciphertext based on input format
            let cipherParams;
            
            if (inputFormat === 'hex') {
                // Convert hex to CipherParams
                const ciphertext = CryptoJS.enc.Hex.parse(encryptedText);
                cipherParams = CryptoJS.lib.CipherParams.create({
                    ciphertext: ciphertext
                });
            } else {
                // Use base64 input directly
                cipherParams = encryptedText;
            }
            
            // Decrypt based on algorithm
            switch (algorithm) {
                case 'aes':
                    decrypted = CryptoJS.AES.decrypt(cipherParams, key);
                    break;
                    
                case 'des':
                    decrypted = CryptoJS.DES.decrypt(cipherParams, key);
                    break;
                    
                case 'tripledes':
                    decrypted = CryptoJS.TripleDES.decrypt(cipherParams, key);
                    break;
                    
                case 'rabbit':
                    decrypted = CryptoJS.Rabbit.decrypt(cipherParams, key);
                    break;
                    
                case 'rc4':
                    decrypted = CryptoJS.RC4.decrypt(cipherParams, key);
                    break;
                    
                default:
                    throw new Error('Unknown decryption algorithm');
            }
            
            // Convert to UTF-8 text
            const result = decrypted.toString(CryptoJS.enc.Utf8);
            
            if (!result) {
                throw new Error('Incorrect key or corrupted data');
            }
            
            return result;
            
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
    
    /**
     * Implements Caesar cipher encryption
     * @param {string} text - Text to encrypt
     * @param {number} shift - Number of positions to shift (1-25)
     * @returns {string} Encrypted text
     */
    caesarCipher(text, shift) {
        shift = parseInt(shift);
        
        if (isNaN(shift) || shift < 1 || shift > 25) {
            throw new Error('Caesar shift must be between 1 and 25');
        }
        
        return text.split('').map(char => {
            const code = char.charCodeAt(0);
            
            // Capital letters (A-Z)
            if (code >= 65 && code <= 90) {
                return String.fromCharCode(((code - 65 + shift) % 26) + 65);
            }
            
            // Lowercase letters (a-z)
            if (code >= 97 && code <= 122) {
                return String.fromCharCode(((code - 97 + shift) % 26) + 97);
            }
            
            // If not a letter, return as is
            return char;
        }).join('');
    }
    
    /**
     * Implements Caesar cipher decryption
     * @param {string} text - Text to decrypt
     * @param {number} shift - Number of positions to shift (1-25)
     * @returns {string} Decrypted text
     */
    caesarDecipher(text, shift) {
        shift = parseInt(shift);
        
        if (isNaN(shift) || shift < 1 || shift > 25) {
            throw new Error('Caesar shift must be between 1 and 25');
        }
        
        // For decryption, we shift in the opposite direction
        const decryptShift = 26 - shift;
        
        return text.split('').map(char => {
            const code = char.charCodeAt(0);
            
            // Capital letters (A-Z)
            if (code >= 65 && code <= 90) {
                return String.fromCharCode(((code - 65 + decryptShift) % 26) + 65);
            }
            
            // Lowercase letters (a-z)
            if (code >= 97 && code <= 122) {
                return String.fromCharCode(((code - 97 + decryptShift) % 26) + 97);
            }
            
            // If not a letter, return as is
            return char;
        }).join('');
    }
    
    /**
     * Gets information about a specific encryption algorithm
     * @param {string} algorithm - Algorithm name
     * @returns {object} Information about the algorithm
     */
    getAlgorithmInfo(algorithm) {
        const algorithms = {
            aes: {
                name: 'AES (Advanced Encryption Standard)',
                description: 'A symmetric block cipher adopted by the U.S. government for the encryption of electronic data.',
                keyLength: '128, 192, or 256 bits',
                strength: 'Very Strong'
            },
            des: {
                name: 'DES (Data Encryption Standard)',
                description: 'A symmetric-key algorithm for the encryption of electronic data. Now considered insecure due to small key size.',
                keyLength: '56 bits',
                strength: 'Weak (not recommended for sensitive data)'
            },
            tripledes: {
                name: 'Triple DES',
                description: 'A symmetric-key block cipher that applies the DES cipher algorithm three times to each data block.',
                keyLength: '168 bits',
                strength: 'Moderate'
            },
            rabbit: {
                name: 'Rabbit',
                description: 'A high-speed stream cipher designed for high performance in software implementations.',
                keyLength: '128 bits',
                strength: 'Strong'
            },
            rc4: {
                name: 'RC4 (Rivest Cipher 4)',
                description: 'A stream cipher. Due to vulnerabilities, it is no longer recommended for use in new systems.',
                keyLength: '40-2048 bits',
                strength: 'Weak (not recommended for sensitive data)'
            },
            caesar: {
                name: 'Caesar Cipher',
                description: 'A simple substitution cipher where each letter is shifted a fixed number of places in the alphabet.',
                keyLength: 'N/A (uses shift value 1-25)',
                strength: 'Very Weak (educational purposes only)'
            }
        };
        
        return algorithms[algorithm] || {
            name: 'Unknown Algorithm',
            description: 'Information not available',
            keyLength: 'Unknown',
            strength: 'Unknown'
        };
    }
}

// Export the class
window.Encryption = Encryption;
