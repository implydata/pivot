import { Router, Request, Response } from 'express';

var router = Router();

router.post('/', (req: Request, res: Response) => {
  console.error(`Client Error: ${JSON.stringify(req.body)}`);
  res.send(`Error logged @ ${new Date().toISOString()}`);
});

export = router;
