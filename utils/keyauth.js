const axios = require('axios');

class KeyAuthAPI {
    constructor() {
        this.sellerKey = process.env.KEYAUTH_SELLER_KEY;
        this.appName = process.env.KEYAUTH_APP_NAME;
        this.ownerID = process.env.KEYAUTH_OWNER_ID; // Vamos adicionar isso
        this.baseURL = 'https://keyauth.win/api/seller/';
        this.clientAPI = 'https://keyauth.win/api/1.2/';
    }

    /**
     * Verifica se uma licença existe e está ativa
     * @param {string} licenseKey - Chave da licença
     * @returns {Promise<Object>} - Dados da licença
     */
    async verifyLicense(licenseKey) {
        try {
            // Primeiro tenta a API do KeyAuth
            const apiResult = await this.verifyLicenseAPI(licenseKey);
            
            // Se a API funcionou, retorna o resultado
            if (apiResult.success || !apiResult.isConnectionError) {
                return apiResult;
            }
            
            console.log('⚠️ SellerAPI indisponível, usando verificação por máscara...');
            
            // Se a API falhou por problemas de conexão, usa verificação por máscara
            return this.verifyLicenseByMask(licenseKey);
            
        } catch (error) {
            console.error('❌ Erro geral na verificação:', error);
            return this.verifyLicenseByMask(licenseKey);
        }
    }

    /**
     * Verifica licença via API do KeyAuth
     */
    async verifyLicenseAPI(licenseKey) {
        try {
            const cleanKey = licenseKey.trim();
            
            if (!cleanKey) {
                return {
                    success: false,
                    message: 'Licença não pode estar vazia',
                    error: 'Empty license key'
                };
            }

            const url = `https://keyauth.win/api/seller/?sellerkey=${encodeURIComponent(this.sellerKey)}&type=verify&key=${encodeURIComponent(cleanKey)}`;
            console.log(`🔍 [API] Verificando licença: ${cleanKey}`);
            
            const requestOptions = {
                method: 'GET',
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Discord-Bot-KeyAuth/1.0'
                },
                timeout: 10000
            };

            const response = await fetch(url, requestOptions);
            const responseText = await response.text();
            
            console.log(`📊 [API] Status: ${response.status}`);
            console.log(`📊 [API] Resposta:`, responseText);
            
            // Tentar parsear como JSON
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                // Se não for JSON, tratar como texto
                responseData = { message: responseText, success: false };
            }
            
            if (responseData && typeof responseData === 'object') {
                const success = responseData.success === true || 
                              responseData.success === 'true' || 
                              responseData.success === '1' ||
                              responseData.success === 1;
                
                const isSuccessMessage = responseData.message && 
                                       (responseData.message.includes('Successfully Verified') ||
                                        responseData.message.includes('Valid') ||
                                        responseData.message.includes('Success'));
                
                const finalSuccess = success || (response.status === 200 && isSuccessMessage);
                
                return {
                    success: finalSuccess,
                    message: responseData.message || (finalSuccess ? 'Licença válida' : 'Licença inválida'),
                    data: responseData,
                    isLicenseError: !finalSuccess && response.status === 406,
                    verificationMethod: 'api'
                };
            } else {
                return {
                    success: false,
                    message: 'Resposta inválida do servidor KeyAuth',
                    error: 'Invalid response format',
                    isConnectionError: true
                };
            }
        } catch (error) {
            console.error('❌ [API] Erro:', error.message);
            
            const isConnectionError = error.name === 'TypeError' || 
                                    error.name === 'FetchError' ||
                                    error.code === 'ENOTFOUND' || 
                                    error.code === 'ETIMEDOUT' ||
                                    error.code === 'ECONNREFUSED' ||
                                    !this.sellerKey;
            
            return {
                success: false,
                message: 'Erro na API KeyAuth',
                error: error.message,
                isConnectionError: isConnectionError,
                statusCode: error.status || 0
            };
        }
    }

    /**
     * Verifica licença por máscara quando API não está disponível
     */
    verifyLicenseByMask(licenseKey) {
        const cleanKey = licenseKey.trim().toUpperCase();
        
        // Verificar se segue o padrão SCARLET-****-****-DURACAO
        const maskPattern = /^SCARLET-[A-Za-z0-9]{4}-[A-Za-z0-9]{6}-([A-Z]+)$/;
        const match = cleanKey.match(maskPattern);
        
        if (!match) {
            return {
                success: false,
                message: 'Formato de licença inválido. Use: SCARLET-****-****-DURACAO',
                verificationMethod: 'mask',
                isLicenseError: true
            };
        }
        
        const duration = match[1];
        const validDurations = ['DIARIO', 'DIARIA', 'SEMANAL', 'MENSAL', 'TRIMENSAL', 'TRIMESTRAL', 'LIFETIME'];
        
        if (!validDurations.includes(duration)) {
            return {
                success: false,
                message: `Duração inválida. Use: ${validDurations.join(', ')}`,
                verificationMethod: 'mask',
                isLicenseError: true
            };
        }
        
        // Calcular data de expiração baseada na duração
        let expirationDate = new Date();
        switch (duration) {
            case 'DIARIO':
            case 'DIARIA':
                expirationDate.setDate(expirationDate.getDate() + 1);
                break;
            case 'SEMANAL':
                expirationDate.setDate(expirationDate.getDate() + 7);
                break;
            case 'MENSAL':
                expirationDate.setMonth(expirationDate.getMonth() + 1);
                break;
            case 'TRIMENSAL':
            case 'TRIMESTRAL':
                expirationDate.setMonth(expirationDate.getMonth() + 3);
                break;
            case 'LIFETIME':
                expirationDate.setFullYear(expirationDate.getFullYear() + 50); // 50 anos no futuro
                break;
        }
        
        return {
            success: true,
            message: `Licença ${duration} verificada automaticamente`,
            data: {
                key: cleanKey,
                duration: duration,
                expires: Math.floor(expirationDate.getTime() / 1000),
                verifiedAt: Math.floor(Date.now() / 1000),
                success: true
            },
            verificationMethod: 'mask',
            requiresApproval: false
        };
    }

    /**
     * Cria uma nova licença
     * @param {number} days - Duração em dias
     * @param {number} amount - Quantidade de licenças
     * @param {string} level - Nível da licença
     * @param {string} note - Nota/descrição
     * @returns {Promise<Object>}
     */
    async createLicense(days, amount = 1, level = '1', note = '') {
        try {
            const url = `${this.baseURL}?sellerkey=${this.sellerKey}&type=add&expiry=${days}&mask=XXXXXX-XXXXXX-XXXXXX-XXXXXX&level=${level}&amount=${amount}&owner=${encodeURIComponent(this.appName)}&character=2&note=${encodeURIComponent(note)}`;
            const response = await axios.get(url);

            return {
                success: response.data.success,
                message: response.data.message,
                keys: response.data.key ? [response.data.key] : []
            };
        } catch (error) {
            console.error('Erro ao criar licença:', error.message);
            return {
                success: false,
                message: 'Erro ao criar licença',
                error: error.message
            };
        }
    }

    /**
     * Deleta uma licença
     * @param {string} licenseKey - Chave da licença
     * @returns {Promise<Object>}
     */
    async deleteLicense(licenseKey) {
        try {
            const url = `${this.baseURL}?sellerkey=${this.sellerKey}&type=del&key=${licenseKey}`;
            const response = await axios.get(url);

            return {
                success: response.data.success,
                message: response.data.message
            };
        } catch (error) {
            console.error('Erro ao deletar licença:', error.message);
            return {
                success: false,
                message: 'Erro ao deletar licença',
                error: error.message
            };
        }
    }

    /**
     * Estende o tempo de uma licença
     * @param {string} licenseKey - Chave da licença
     * @param {number} days - Dias para adicionar
     * @returns {Promise<Object>}
     */
    async extendLicense(licenseKey, days) {
        try {
            const url = `${this.baseURL}?sellerkey=${this.sellerKey}&type=extend&key=${licenseKey}&expiry=${days}`;
            const response = await axios.get(url);

            return {
                success: response.data.success,
                message: response.data.message
            };
        } catch (error) {
            console.error('Erro ao estender licença:', error.message);
            return {
                success: false,
                message: 'Erro ao estender licença',
                error: error.message
            };
        }
    }

    /**
     * Obtém informações de uma licença específica
     * @param {string} licenseKey - Chave da licença
     * @returns {Promise<Object>}
     */
    async getLicenseInfo(licenseKey) {
        try {
            const url = `${this.baseURL}?sellerkey=${this.sellerKey}&type=info&key=${licenseKey}`;
            const response = await axios.get(url);

            return {
                success: response.data.success,
                data: response.data
            };
        } catch (error) {
            console.error('Erro ao obter info da licença:', error.message);
            return {
                success: false,
                message: 'Erro ao obter informações',
                error: error.message
            };
        }
    }

    /**
     * Lista todas as licenças
     * @returns {Promise<Object>}
     */
    async listAllLicenses() {
        try {
            const url = `${this.baseURL}?sellerkey=${this.sellerKey}&type=fetchalllicenses`;
            const response = await axios.get(url);

            return {
                success: response.data.success,
                licenses: response.data.licenses || []
            };
        } catch (error) {
            console.error('Erro ao listar licenças:', error.message);
            return {
                success: false,
                message: 'Erro ao listar licenças',
                error: error.message
            };
        }
    }

    /**
     * Bane uma licença
     * @param {string} licenseKey - Chave da licença
     * @param {string} reason - Motivo do ban
     * @returns {Promise<Object>}
     */
    async banLicense(licenseKey, reason = 'Violação de termos') {
        try {
            const url = `${this.baseURL}?sellerkey=${this.sellerKey}&type=ban&key=${licenseKey}&reason=${encodeURIComponent(reason)}`;
            const response = await axios.get(url);

            return {
                success: response.data.success,
                message: response.data.message
            };
        } catch (error) {
            console.error('Erro ao banir licença:', error.message);
            return {
                success: false,
                message: 'Erro ao banir licença',
                error: error.message
            };
        }
    }

    /**
     * Desbane uma licença
     * @param {string} licenseKey - Chave da licença
     * @returns {Promise<Object>}
     */
    async unbanLicense(licenseKey) {
        try {
            const url = `${this.baseURL}?sellerkey=${this.sellerKey}&type=unban&key=${licenseKey}`;
            const response = await axios.get(url);

            return {
                success: response.data.success,
                message: response.data.message
            };
        } catch (error) {
            console.error('Erro ao desbanir licença:', error.message);
            return {
                success: false,
                message: 'Erro ao desbanir licença',
                error: error.message
            };
        }
    }
}

module.exports = new KeyAuthAPI();
