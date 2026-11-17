import { Router } from 'express';
import { optionalAuthenticate } from '../../middleware/auth.middleware';
import { validateParams, validateQuery } from '../../middleware/validate.middleware';
import { FacilitiesController } from './facilities.controller';
import { facilityCodeParamSchema, facilitySlotsQuerySchema } from './facilities.schema';

const facilitiesRouter = Router();

facilitiesRouter.get('/', optionalAuthenticate, FacilitiesController.listFacilities);

facilitiesRouter.get(
  '/:code/slots',
  optionalAuthenticate,
  validateParams(facilityCodeParamSchema),
  validateQuery(facilitySlotsQuerySchema),
  FacilitiesController.getPublicSlots
);

export default facilitiesRouter;
