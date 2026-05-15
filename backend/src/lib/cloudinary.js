const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const proofStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'fleetiq/proofs', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], resource_type: 'image' },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'fleetiq/avatars', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], resource_type: 'image', transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] },
});

const uploadProof  = multer({ storage: proofStorage,  limits: { fileSize: 10 * 1024 * 1024 } });
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 5  * 1024 * 1024 } });

module.exports = { cloudinary, uploadProof, uploadAvatar };
