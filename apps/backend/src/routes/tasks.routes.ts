import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/tasks.controller';

const router = Router();
router.use(authenticate);

router.get('/',        getTasks);
router.post('/',       createTask);
router.patch('/:id',   updateTask);
router.delete('/:id',  deleteTask);

export default router;
