/**
 * CryptoSteg - Steganography Module
 * Handles hiding and extracting data from images using LSB steganography
 */

class Steganography {
    constructor() {
        this.maxDataSize = 0; // Will be calculated based on image dimensions
    }

    /**
     * Calculates the maximum number of characters that can be stored in an image
     * @param {HTMLImageElement} image - The image element
     * @returns {number} Maximum number of characters
     */
    calculateMaxTextLength(image) {
        // Each pixel can hide 3 bits (1 in each RGB channel)
        // Each character needs 8 bits, so each character needs ~2.67 pixels
        return Math.floor((image.width * image.height * 3) / 8);
    }

    /**
     * Converts text to binary string
     * @param {string} text - Text to convert
     * @returns {string} Binary representation
     */
    textToBinary(text) {
        let binary = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const bin = charCode.toString(2).padStart(8, '0');
            binary += bin;
        }
        return binary;
    }

    /**
     * Converts binary string to text
     * @param {string} binary - Binary string
     * @returns {string} Resulting text
     */
    binaryToText(binary) {
        let text = '';
        for (let i = 0; i < binary.length; i += 8) {
            const byte = binary.substr(i, 8);
            if (byte.length === 8) {
                const charCode = parseInt(byte, 2);
                text += String.fromCharCode(charCode);
            }
        }
        return text;
    }

    /**
     * Converts number to binary string with a specific bit length
     * @param {number} number - Number to convert
     * @param {number} bitLength - Desired bit length of result
     * @returns {string} Binary representation
     */
    numberToBinary(number, bitLength) {
        return number.toString(2).padStart(bitLength, '0');
    }

    /**
     * Hides text data inside an image using LSB (Least Significant Bit) technique
     * @param {HTMLImageElement} image - The image element to hide data in
     * @param {string} text - The text to hide
     * @param {string} password - Optional password to encrypt data before hiding
     * @returns {Promise<Blob>} The new image with hidden data
     */
    async hideData(image, text, password = '') {
        return new Promise((resolve, reject) => {
            try {
                // Create canvas and context
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas dimensions to match image
                canvas.width = image.width;
                canvas.height = image.height;
                
                // Draw image on canvas
                ctx.drawImage(image, 0, 0);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Calculate maximum data size (each pixel can hide 3 bits - 1 in each RGB channel)
                // We need 8 bits per character, so each character requires ~2.67 pixels
                this.maxDataSize = Math.floor((data.length / 4) * 3 / 8);
                
                // Encrypt text if password is provided
                let processedText = text;
                if (password && password.length > 0) {
                    // Use consistent encryption format
                    processedText = CryptoJS.AES.encrypt(text, password).toString();
                    console.log('Encrypted text for hiding:', processedText);
                }
                
                // Prepare data to hide
                // Add a prefix to identify encrypted data and a delimiter to mark the end
                const prefix = password ? 'ENC:' : 'TXT:';
                const dataToHide = prefix + processedText + '<<EOF>>';
                
                console.log('Data to hide (with prefix):', prefix + (processedText.length > 20 ? 
                    processedText.substring(0, 20) + '...' : processedText));
                console.log('Total data length:', dataToHide.length);
                
                // Check if data fits in the image
                if (dataToHide.length > this.maxDataSize) {
                    throw new Error(`Data too large for this image. Maximum: ${this.maxDataSize} characters`);
                }
                
                // Convert string to binary
                const binaryData = this.textToBinary(dataToHide);
                
                // First 32 bits are the length of data (as a header)
                const dataLengthBinary = this.numberToBinary(dataToHide.length, 32);
                console.log('Data length binary:', dataLengthBinary);
                console.log('Data length actual:', dataToHide.length);
                
                // Hide the length header
                for (let i = 0; i < 32; i++) {
                    // Modify the least significant bit of each color channel
                    data[i] = (data[i] & 0xFE) | parseInt(dataLengthBinary[i], 2);
                }
                
                // Hide the actual data
                for (let i = 0; i < binaryData.length; i++) {
                    // Skip alpha channel (every 4th byte)
                    const dataIndex = 32 + i + Math.floor((32 + i) / 3);
                    if ((dataIndex + 1) % 4 === 0) continue; // Skip alpha
                    
                    // Modify the least significant bit
                    if (dataIndex < data.length) {
                        data[dataIndex] = (data[dataIndex] & 0xFE) | parseInt(binaryData[i], 2);
                    }
                }
                
                // Put the modified data back on the canvas
                ctx.putImageData(imageData, 0, 0);
                
                // Convert canvas to blob with maximum quality
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png', 1.0);
                
            } catch (error) {
                console.error('Error hiding data:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Extracts hidden data from an image
     * @param {HTMLImageElement} image - The image with hidden data
     * @param {string} password - Optional password to decrypt data after extraction
     * @returns {Promise<string>} The extracted text
     */
    async extractData(image, password = '') {
        return new Promise((resolve, reject) => {
            try {
                // Create canvas and context
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas dimensions to match image
                canvas.width = image.width;
                canvas.height = image.height;
                
                // Draw image on canvas
                ctx.drawImage(image, 0, 0);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Extract length header (first 32 bits)
                let lengthBinary = '';
                for (let i = 0; i < 32; i++) {
                    lengthBinary += data[i] & 1;
                }
                
                // Convert binary to decimal to get the length of hidden data
                const length = parseInt(lengthBinary, 2);
                
                // Check if length is valid
                if (length <= 0 || length > (data.length / 4)) {
                    throw new Error('No hidden data found or invalid data');
                }
                
                // Calculate how many bits we need to extract (8 bits per character)
                const bitsToExtract = length * 8;
                
                // Extract the hidden bits
                let extractedBinary = '';
                let bitCount = 0;
                
                console.log(`Need to extract ${bitsToExtract} bits of data`);
                
                // Use a more accurate method to match how data was hidden
                for (let i = 32; bitCount < bitsToExtract; i++) {
                    // Skip alpha channel (every 4th byte)
                    if ((i + 1) % 4 === 0) continue;
                    
                    if (i < data.length) {
                        // Get the least significant bit
                        const bit = data[i] & 1;
                        extractedBinary += bit;
                        
                        // Log the first few extracted bits
                        if (bitCount < 16) {
                            console.log(`Bit ${bitCount} at position ${i}: ${bit}`);
                        }
                        
                        bitCount++;
                    }
                }
                
                console.log(`Extracted ${extractedBinary.length} bits of data`);
                // Sanity check
                if (extractedBinary.length !== bitsToExtract) {
                    console.warn(`Warning: Expected ${bitsToExtract} bits but got ${extractedBinary.length}`);
                }
                
                // Convert binary to text
                const extractedText = this.binaryToText(extractedBinary);
                
                // Check for the EOF delimiter
                console.log('Looking for EOF marker in extracted text...');
                if (!extractedText.includes('<<EOF>>')) {
                    // Try to recover data even without EOF
                    console.warn('Warning: End marker not found. Will attempt to process anyway.');
                    // Look for format markers instead
                    if (extractedText.includes('TXT:') || extractedText.includes('ENC:')) {
                        console.log('Found format marker, proceeding with partial data');
                    } else {
                        throw new Error('Data extraction failed: No valid data format or end marker found');
                    }
                }
                
                // Remove the EOF delimiter if it exists, otherwise use the whole text
                const cleanText = extractedText.includes('<<EOF>>') ? 
                    extractedText.split('<<EOF>>')[0] : 
                    extractedText;
                
                // Debug information
                console.log('Extracted text raw:', extractedText);
                console.log('Clean text (pre-format check):', cleanText);
                
                // Try to infer format if it's not clear
                let dataType = 'unknown';
                let processedText = cleanText;
                
                // First check for exact prefix
                if (cleanText.startsWith('ENC:')) {
                    dataType = 'encrypted';
                    processedText = cleanText.substring(4); // Remove 'ENC:' prefix
                } else if (cleanText.startsWith('TXT:')) {
                    dataType = 'plaintext';
                    processedText = cleanText.substring(4); // Remove 'TXT:' prefix
                } 
                // If not found, search within the first few characters (might have corrupt starting bytes)
                else if (cleanText.substring(0, 20).includes('ENC:')) {
                    dataType = 'encrypted';
                    // Adjust processedText to start from ENC:
                    const encIndex = cleanText.indexOf('ENC:');
                    console.log('Found ENC: at position', encIndex);
                    processedText = cleanText.substring(encIndex + 4);
                } else if (cleanText.substring(0, 20).includes('TXT:')) {
                    dataType = 'plaintext';
                    // Adjust processedText to start from TXT:
                    const txtIndex = cleanText.indexOf('TXT:');
                    console.log('Found TXT: at position', txtIndex);
                    processedText = cleanText.substring(txtIndex + 4);
                }
                
                console.log('Identified data type:', dataType);
                
                // Process based on identified data type
                if (dataType === 'encrypted') {
                    if (!password) {
                        throw new Error('This data is encrypted. Please provide a password.');
                    }
                    
                    try {
                        // Decrypt the data
                        console.log('Encrypted text before decryption:', processedText);
                        
                        const decrypted = CryptoJS.AES.decrypt(processedText, password).toString(CryptoJS.enc.Utf8);
                        
                        if (!decrypted) {
                            throw new Error('Incorrect password or corrupted data');
                        }
                        
                        resolve(decrypted);
                    } catch (e) {
                        console.error('Decryption error details:', e);
                        throw new Error('Decryption failed: Incorrect password or corrupted data');
                    }
                } else if (dataType === 'plaintext') {
                    // Not encrypted, return the clean text
                    resolve(processedText);
                } else {
                    console.error('Unknown format, text starts with:', cleanText.substring(0, 20));
                    
                    // Last-ditch effort: try to find something readable
                    const possibleText = cleanText.replace(/[^\x20-\x7E]/g, '');
                    if (possibleText.length > 10) {
                        console.log('Found readable text segment:', possibleText);
                        resolve('Partial recovery: ' + possibleText);
                    } else {
                        throw new Error('Unknown data format. Could not extract hidden text.');
                    }
                }
                
            } catch (error) {
                console.error('Extraction error:', error);
                reject(error);
            }
        });
    }
}

// Make the class available globally
window.Steganography = Steganography;
