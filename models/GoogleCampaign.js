const mongoose = require('mongoose');

const GoogleCampaignSchema = new mongoose.Schema({
	campaignId: Number,
	campaignName: String,
	campaignManager: String
})

const GoogleCampaign = mongoose.model('GoogleCampaign', GoogleCampaignSchema);

module.exports = { GoogleCampaign, GoogleCampaignSchema };
