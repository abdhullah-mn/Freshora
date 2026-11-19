import mongoose from 'mongoose';

const connectDb = async ()=>{
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
        throw new Error('MONGODB_URI is missing. Set it in server/.env.');
    }

    try {
        await mongoose.connect(uri, { dbName: 'greencart' });
        console.log('MongoDB connected successfully');
    } catch (error) {
        if (error.syscall === 'querySrv') {
            throw new Error('MongoDB DNS lookup failed. Check that your Atlas cluster is active and MONGODB_URI in server/.env matches its current connection string. If both are correct, check your DNS connection.');
        }
        throw error;
    }
}

export default connectDb;
