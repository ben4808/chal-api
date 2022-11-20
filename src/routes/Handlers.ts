import { Request, Response } from "express";
import PostgresDao from "../daos/PostgresDao";
import { Chal } from "../models/Chal";
import { StatusCodes } from 'http-status-codes';
import { Solve } from "../models/Solve";

let dao = new PostgresDao();

export async function createChal(req: Request, res: Response) {
    let chal = req.body! as Chal;

    if (!chal)
        return res.status(StatusCodes.OK).json(`{'message': 'Failed: Improper parameters.'}`);

    try {
        let results = await dao.createChal(chal);
        
        return res.status(StatusCodes.OK).json(results);
    }
    catch(ex) {
        return res.status(StatusCodes.OK).json(`{'message': 'Failed: ${ex}'}`);
    }
}

export async function getChal(req: Request, res: Response) {
  let query = req.query.query as string;
  if (!query)
      return res.status(StatusCodes.OK).json(`{'message': 'Failed: Improper parameters.'}`);

  try {
      let results = await dao.getChal(query);
      
      return res.status(StatusCodes.OK).json(results);
  }
  catch(ex) {
      return res.status(StatusCodes.OK).json(`{'message': 'Failed: ${ex}'}`);
  }
}

export async function createSolve(req: Request, res: Response) {
    let solve = req.body! as Solve;

    if (!solve)
        return res.status(StatusCodes.OK).json(`{'message': 'Failed: Improper parameters.'}`);

    try {
        let results = await dao.createSolve(solve);
        
        return res.status(StatusCodes.OK).json(results);
    }
    catch(ex) {
        return res.status(StatusCodes.OK).json(`{'message': 'Failed: ${ex}'}`);
    }
}
