import { Router } from 'express';
import { z } from 'zod';
import { limaCoordinates, searchPlaces, reversePlace } from '../services/mapsService';
export const mapsRoutes = Router();
mapsRoutes.get('/search', async (req, res) => { const { q } = z.object({ q: z.string().trim().min(3).max(200) }).parse(req.query); res.json(await searchPlaces(q)); });
mapsRoutes.get('/reverse', async (req, res) => { const point = limaCoordinates.parse({ latitude: req.query.lat, longitude: req.query.lng }); res.json(await reversePlace(point.latitude, point.longitude)); });
