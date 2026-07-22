// Add your Google Maps Embed API key here if you want iframe embeds to be used.
// Example:
// window.GOOGLE_MAPS_API_KEY = 'AIza...';
// Leave as an empty string to use Leaflet/OSM fallback (or fallback link) instead.
window.GOOGLE_MAPS_API_KEY = '';

// Shared settings for making Notary PM a satellite of hannadunchenko.com
window.SHARED_SETTINGS = {
	// Primary domain to sync with
	mainDomain: 'https://hannadunchenko.com',
	// Analytics ID placeholder (Google Analytics / GA4 measurement ID or UA-XXX)
	analyticsId: '',
	// Other shared keys (e.g., Google Tag Manager ID) can go here
	gtmId: '',
	// Contact sync: email/phone from main site
	contact: {
		email: 'notary@hannadunchenko.com',
		phone: ''
	}
};

// Force use of Leaflet/OpenStreetMap even if Google key is present (set true to prefer OSM)
window.FORCE_LEAFLET = false;
