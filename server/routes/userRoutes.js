import express from 'express';
import { registerUser, login, isAuth, userlogout } from '../controllers/userController.js';
import authSession from '../middlewares/authSession.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', login);
userRouter.get('/is-Auth', authSession, isAuth);
userRouter.get('/logout', userlogout);

export default userRouter;