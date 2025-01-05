import app from '../src/app';
import { describe, expect, it } from '@jest/globals';


describe('App', () => {
    it('should exist', () => {
        expect(app).toBeDefined();
    });
});