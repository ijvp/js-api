const CryptoJS = require('crypto-js');

const encrypt = (text) => {
	return CryptoJS.AES.encrypt(text, process.env.CRYPTO_SECRET).toString();
};

const decrypt = (cypher) => {
	return CryptoJS.AES.decrypt(cypher, process.env.CRYPTO_SECRET).toString(CryptoJS.enc.Utf8);
};

//type = 'access' || 'refresh'
//platform = 'facebook' || 'google' || 'shopify'
//if platform == 'shopify', must also include store in req.body
const getToken = (req, platform, type = "access") => {
	const store = req.body?.store || req.query?.store;
	if (!platform || !store) {
		return;
	}

	const selectedToken = `${platform}_${type}_token`;
	return req.user.shops.find(shop => shop.name === store)[selectedToken];
}

module.exports = { encrypt, decrypt, getToken };