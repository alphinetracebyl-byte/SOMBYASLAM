import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, User, Phone, MapPin, ChevronRight, Map } from 'lucide-react';
import { PremisesMap } from './PremisesMap';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { getBadge } from '@/utils/statusBadge';
import s from './field-premises.module.css';

// ── Types ──────────────────────────────────────────────────────────────────────

type TagColor = 'yellow' | 'orange' | 'green' | 'blue' | 'red';

interface BatchAnimal {
  id: string; seq: number; sex: 'M' | 'F'; ageMonths: number; weightKg: number; features: string;
  animalId?: string; tagSerial?: string; tagType?: 'RFID' | 'EAR_TAG'; tagColor?: TagColor;
  tagStatus: 'TAGGED' | 'UNTAGGED';
  photoUrl?: string;
}

interface Batch {
  id: string; batchCode: string; batchName: string;
  species: string; breed: string; count: number; status: string; createdAt: string;
  animals: BatchAnimal[];
}

interface Premises {
  id: string; code: string; name: string;
  owner: string; phone: string; type: string; status: string;
  lat?: number; lng?: number;
  batches: Batch[];
  cattleCount?: number; camelCount?: number; sheepCount?: number; goatCount?: number;
}

// ── Regions ────────────────────────────────────────────────────────────────────

const REGIONS = [
  { id: 'awdal',        name: 'Awdal',           code: 'AWD' },
  { id: 'woqooyi',      name: 'Woqooyi Galbeed', code: 'WOG' },
  { id: 'togdheer',     name: 'Togdheer',         code: 'TOG' },
  { id: 'sanaag',       name: 'Sanaag',           code: 'SAN' },
  { id: 'bari',         name: 'Bari',             code: 'BAR' },
  { id: 'sool',         name: 'Sool',             code: 'SOL' },
  { id: 'nugaal',       name: 'Nugaal',           code: 'NUG' },
  { id: 'mudug',        name: 'Mudug',            code: 'MUD' },
  { id: 'galgaduud',    name: 'Galgaduud',        code: 'GAL' },
  { id: 'hiiraan',      name: 'Hiiraan',          code: 'HIR' },
  { id: 'bakool',       name: 'Bakool',           code: 'BAK' },
  { id: 'bay',          name: 'Bay',              code: 'BAY' },
  { id: 'middle_shab',  name: 'Mid. Shabelle',    code: 'MSH' },
  { id: 'banaadir',     name: 'Banaadir',         code: 'BAN' },
  { id: 'lower_shab',   name: 'Lower Shabelle',   code: 'LSH' },
  { id: 'gedo',         name: 'Gedo',             code: 'GED' },
  { id: 'middle_jubba', name: 'Middle Jubba',     code: 'MJU' },
  { id: 'lower_jubba',  name: 'Lower Jubba',      code: 'LJU' },
];

// ── (mock data removed — now loaded from Supabase) ────────────────────────────

const _UNUSED: Record<string, Premises[]> = {

  awdal: [
    {
      id: 'prm-awd-1', code: 'SOM-AWD-001', name: 'Borama Central Farm',
      owner: 'Cabdi Xasan Faarax', phone: '+252 63 410 2211', type: 'Farm', status: 'APPROVED', lat: 9.9376, lng: 43.1803,
      batches: [
        { id: 'ba1', batchCode: 'HRD-2026-AWD-001', batchName: 'Borama Cattle Herd', species: 'Cattle', breed: 'Somali Zebu', count: 4, status: 'TAGGED', createdAt: '2026-07-10',
          animals: [
            { id: 'aa1', seq: 1, sex: 'M', ageMonths: 36, weightKg: 270, features: 'White forehead', animalId: '9010000101', tagSerial: '9010000101', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'aa2', seq: 2, sex: 'M', ageMonths: 40, weightKg: 295, features: '', animalId: '9010000102', tagSerial: '9010000102', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'aa3', seq: 3, sex: 'F', ageMonths: 30, weightKg: 220, features: 'Brown coat', animalId: '9010000103', tagSerial: '9010000103', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'aa4', seq: 4, sex: 'F', ageMonths: 26, weightKg: 200, features: '', tagStatus: 'UNTAGGED' },
          ],
        },
        { id: 'ba2', batchCode: 'HRD-2026-AWD-002', batchName: 'Borama Goat Group', species: 'Goat', breed: 'Somali', count: 3, status: 'APPROVED', createdAt: '2026-08-01',
          animals: [
            { id: 'aa5', seq: 1, sex: 'M', ageMonths: 20, weightKg: 38, features: '', tagStatus: 'UNTAGGED' },
            { id: 'aa6', seq: 2, sex: 'F', ageMonths: 16, weightKg: 28, features: '', tagStatus: 'UNTAGGED' },
            { id: 'aa7', seq: 3, sex: 'F', ageMonths: 14, weightKg: 24, features: 'White patch', tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
    {
      id: 'prm-awd-2', code: 'SOM-AWD-002', name: 'Dilla Pastoral Camp',
      owner: 'Xaawo Cali Warsame', phone: '+252 63 522 3344', type: 'Pastoral Camp', status: 'APPROVED', lat: 10.1167, lng: 42.8833,
      batches: [
        { id: 'ba3', batchCode: 'HRD-2026-AWD-003', batchName: 'Dilla Camel Herd', species: 'Camel', breed: 'Somali Dromedary', count: 5, status: 'APPROVED', createdAt: '2026-07-20',
          animals: [
            { id: 'aa8',  seq: 1, sex: 'M', ageMonths: 84, weightKg: 510, features: 'Tall, light coat', animalId: '9010000201', tagSerial: '9010000201', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'aa9',  seq: 2, sex: 'F', ageMonths: 60, weightKg: 420, features: '', tagStatus: 'UNTAGGED' },
            { id: 'aa10', seq: 3, sex: 'F', ageMonths: 48, weightKg: 370, features: '', tagStatus: 'UNTAGGED' },
            { id: 'aa11', seq: 4, sex: 'F', ageMonths: 36, weightKg: 340, features: 'Brown neck', tagStatus: 'UNTAGGED' },
            { id: 'aa12', seq: 5, sex: 'F', ageMonths: 24, weightKg: 290, features: '', tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
    {
      id: 'prm-awd-3', code: 'SOM-AWD-003', name: 'Lughaye Livestock Yard',
      owner: 'Maxamed Yuusuf Guure', phone: '+252 63 611 5500', type: 'Livestock Yard', status: 'APPROVED', lat: 11.1500, lng: 43.6167,
      batches: [
        { id: 'ba4', batchCode: 'HRD-2026-AWD-004', batchName: 'Lughaye Sheep Flock', species: 'Sheep', breed: 'Somali Blackhead', count: 6, status: 'SUBMITTED', createdAt: '2026-08-05',
          animals: [
            { id: 'aa13', seq: 1, sex: 'M', ageMonths: 22, weightKg: 42, features: '', tagStatus: 'UNTAGGED' },
            { id: 'aa14', seq: 2, sex: 'M', ageMonths: 18, weightKg: 36, features: 'Black head', tagStatus: 'UNTAGGED' },
            { id: 'aa15', seq: 3, sex: 'F', ageMonths: 16, weightKg: 30, features: '', tagStatus: 'UNTAGGED' },
            { id: 'aa16', seq: 4, sex: 'F', ageMonths: 14, weightKg: 26, features: '', tagStatus: 'UNTAGGED' },
            { id: 'aa17', seq: 5, sex: 'F', ageMonths: 12, weightKg: 22, features: 'White legs', tagStatus: 'UNTAGGED' },
            { id: 'aa18', seq: 6, sex: 'F', ageMonths: 10, weightKg: 18, features: '', tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
  ],

  banaadir: [
    {
      id: 'prm1', code: 'SOM-MOG-004', name: 'Daynile Farm',
      owner: 'Ahmed Hassan', phone: '+252 61 234 5678', type: 'Farm', status: 'APPROVED', lat: 2.1167, lng: 45.2837,
      batches: [
        { id: 'b1', batchCode: 'HRD-2026-MOG-001', batchName: 'Daynile Zebu Herd', species: 'Cattle', breed: 'Somali Zebu', count: 3, status: 'TAGGED', createdAt: '2026-07-15',
          animals: [
            { id: 'a1', seq: 1, sex: 'M', ageMonths: 36, weightKg: 280, features: 'White patch', animalId: '9001000441', tagSerial: '9001000441', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'a2', seq: 2, sex: 'M', ageMonths: 42, weightKg: 310, features: 'Brown coat',  animalId: '9001000442', tagSerial: '9001000442', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'a3', seq: 3, sex: 'F', ageMonths: 28, weightKg: 245, features: 'Black face',  animalId: '9001000443', tagSerial: '9001000443', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
          ],
        },
        { id: 'b2', batchCode: 'HRD-2026-MOG-003', batchName: 'Small Goat Group', species: 'Goat', breed: 'Somali', count: 2, status: 'APPROVED', createdAt: '2026-08-01',
          animals: [
            { id: 'a4', seq: 1, sex: 'M', ageMonths: 24, weightKg: 42, features: '', tagStatus: 'UNTAGGED' },
            { id: 'a5', seq: 2, sex: 'F', ageMonths: 18, weightKg: 32, features: 'Brown coat', tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
    {
      id: 'prm1b', code: 'SOM-MOG-009', name: 'Hodan Livestock Yard',
      owner: 'Sahra Warsame', phone: '+252 61 312 8800', type: 'Livestock Yard', status: 'APPROVED', lat: 2.0469, lng: 45.3182,
      batches: [
        { id: 'b2b', batchCode: 'HRD-2026-MOG-007', batchName: 'Hodan Cattle Lot', species: 'Cattle', breed: 'Somali Zebu', count: 5, status: 'APPROVED', createdAt: '2026-07-20',
          animals: [
            { id: 'a6', seq: 1, sex: 'M', ageMonths: 30, weightKg: 260, features: '', animalId: '9001000500', tagSerial: '9001000500', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'a7', seq: 2, sex: 'M', ageMonths: 34, weightKg: 275, features: 'Spotted', animalId: '9001000501', tagSerial: '9001000501', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'a8', seq: 3, sex: 'F', ageMonths: 24, weightKg: 210, features: '', tagStatus: 'UNTAGGED' },
            { id: 'a9', seq: 4, sex: 'F', ageMonths: 22, weightKg: 195, features: 'White face', tagStatus: 'UNTAGGED' },
            { id: 'a10', seq: 5, sex: 'F', ageMonths: 20, weightKg: 185, features: '', tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
  ],

  bay: [
    {
      id: 'prm2', code: 'SOM-BAY-011', name: 'Baidoa Livestock Holdings',
      owner: 'Faadumo Ali', phone: '+252 61 876 5432', type: 'Farm', status: 'APPROVED', lat: 3.1167, lng: 43.6500,
      batches: [
        { id: 'b3', batchCode: 'HRD-2026-BAY-002', batchName: 'Baidoa Sheep Flock', species: 'Sheep', breed: 'Somali Blackhead', count: 4, status: 'APPROVED', createdAt: '2026-07-28',
          animals: [
            { id: 'c1', seq: 1, sex: 'M', ageMonths: 18, weightKg: 36, features: '', animalId: '9001000201', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
            { id: 'c2', seq: 2, sex: 'M', ageMonths: 20, weightKg: 38, features: 'Black legs', animalId: '9001000202', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
            { id: 'c3', seq: 3, sex: 'F', ageMonths: 16, weightKg: 30, features: '', animalId: '9001000203', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
            { id: 'c4', seq: 4, sex: 'F', ageMonths: 15, weightKg: 28, features: 'White blaze', animalId: '9001000204', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'UNTAGGED' },
          ],
        },
        { id: 'b3b', batchCode: 'HRD-2026-BAY-005', batchName: 'Bay Camel Group', species: 'Camel', breed: 'Somali Dromedary', count: 3, status: 'SUBMITTED', createdAt: '2026-08-04',
          animals: [
            { id: 'c5', seq: 1, sex: 'M', ageMonths: 72, weightKg: 480, features: 'Tall, dark', tagStatus: 'UNTAGGED' },
            { id: 'c6', seq: 2, sex: 'F', ageMonths: 60, weightKg: 410, features: '', tagStatus: 'UNTAGGED' },
            { id: 'c7', seq: 3, sex: 'F', ageMonths: 48, weightKg: 360, features: 'Light coat', tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
    {
      id: 'prm2b', code: 'SOM-BAY-015', name: 'Dinsor Pastoral Unit',
      owner: 'Abdirizak Nur', phone: '+252 61 901 2233', type: 'Pastoral Camp', status: 'APPROVED', lat: 2.4000, lng: 43.9667,
      batches: [
        { id: 'b3c', batchCode: 'HRD-2026-BAY-008', batchName: 'Dinsor Goat Flock', species: 'Goat', breed: 'Somali', count: 6, status: 'APPROVED', createdAt: '2026-07-10',
          animals: [
            { id: 'c8',  seq: 1, sex: 'M', ageMonths: 18, weightKg: 38, features: '',            tagStatus: 'UNTAGGED' },
            { id: 'c9',  seq: 2, sex: 'M', ageMonths: 20, weightKg: 40, features: 'Black coat',  tagStatus: 'UNTAGGED' },
            { id: 'c10', seq: 3, sex: 'F', ageMonths: 14, weightKg: 28, features: '',            tagStatus: 'UNTAGGED' },
            { id: 'c11', seq: 4, sex: 'F', ageMonths: 16, weightKg: 30, features: 'White patch', tagStatus: 'UNTAGGED' },
            { id: 'c12', seq: 5, sex: 'F', ageMonths: 12, weightKg: 24, features: '',            tagStatus: 'UNTAGGED' },
            { id: 'c13', seq: 6, sex: 'F', ageMonths: 10, weightKg: 20, features: '',            tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
  ],

  lower_jubba: [
    {
      id: 'prm3', code: 'SOM-JUB-004', name: 'Kismayo Camel Station',
      owner: 'Mohamed Said', phone: '+252 61 555 1234', type: 'Pastoral Camp', status: 'APPROVED', lat: 0.3582, lng: 42.5454,
      batches: [
        { id: 'b4', batchCode: 'HRD-2026-KIS-003', batchName: 'Kismayo Goat Herd', species: 'Goat', breed: 'Somali', count: 3, status: 'UNDER_REVIEW', createdAt: '2026-08-02',
          animals: [
            { id: 'd1', seq: 1, sex: 'M', ageMonths: 24, weightKg: 42, features: '', tagStatus: 'UNTAGGED' },
            { id: 'd2', seq: 2, sex: 'F', ageMonths: 18, weightKg: 32, features: '', tagStatus: 'UNTAGGED' },
            { id: 'd3', seq: 3, sex: 'F', ageMonths: 20, weightKg: 35, features: 'Brown coat', tagStatus: 'UNTAGGED' },
          ],
        },
        { id: 'b4b', batchCode: 'HRD-2026-KIS-006', batchName: 'Kismayo Camel Herd', species: 'Camel', breed: 'Somali Dromedary', count: 4, status: 'APPROVED', createdAt: '2026-07-25',
          animals: [
            { id: 'd4', seq: 1, sex: 'M', ageMonths: 84, weightKg: 520, features: 'Large, strong', animalId: '9002000101', tagSerial: '9002000101', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'd5', seq: 2, sex: 'F', ageMonths: 60, weightKg: 420, features: '',              animalId: '9002000102', tagSerial: '9002000102', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'd6', seq: 3, sex: 'F', ageMonths: 48, weightKg: 380, features: 'Light coat',   tagStatus: 'UNTAGGED' },
            { id: 'd7', seq: 4, sex: 'F', ageMonths: 36, weightKg: 340, features: '',              tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
  ],

  nugaal: [
    {
      id: 'prm4', code: 'SOM-GAR-002', name: 'Garowe Highland Farm',
      owner: 'Hodan Abdullahi', phone: '+252 61 777 9988', type: 'Farm', status: 'APPROVED', lat: 8.4054, lng: 48.4845,
      batches: [
        { id: 'b5', batchCode: 'HRD-2026-GAR-001', batchName: 'Garowe Camel Herd', species: 'Camel', breed: 'Somali Dromedary', count: 2, status: 'SUBMITTED', createdAt: '2026-08-03',
          animals: [
            { id: 'e1', seq: 1, sex: 'M', ageMonths: 60, weightKg: 450, features: 'Dark brown', tagStatus: 'UNTAGGED' },
            { id: 'e2', seq: 2, sex: 'F', ageMonths: 48, weightKg: 380, features: '', tagStatus: 'UNTAGGED' },
          ],
        },
        { id: 'b5b', batchCode: 'HRD-2026-GAR-004', batchName: 'Garowe Sheep Flock', species: 'Sheep', breed: 'Somali Blackhead', count: 5, status: 'APPROVED', createdAt: '2026-07-18',
          animals: [
            { id: 'e3', seq: 1, sex: 'M', ageMonths: 22, weightKg: 40, features: '',             animalId: '9003000301', tagSerial: '9003000301', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'e4', seq: 2, sex: 'M', ageMonths: 18, weightKg: 36, features: 'Black head',  animalId: '9003000302', tagSerial: '9003000302', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'e5', seq: 3, sex: 'F', ageMonths: 16, weightKg: 30, features: '',             tagStatus: 'UNTAGGED' },
            { id: 'e6', seq: 4, sex: 'F', ageMonths: 14, weightKg: 27, features: 'White legs',  tagStatus: 'UNTAGGED' },
            { id: 'e7', seq: 5, sex: 'F', ageMonths: 12, weightKg: 24, features: '',             tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
    {
      id: 'prm4b', code: 'SOM-GAR-007', name: 'Eyl Coastal Ranch',
      owner: 'Abdullahi Farah', phone: '+252 61 644 3311', type: 'Ranch', status: 'APPROVED', lat: 7.9786, lng: 49.8200,
      batches: [
        { id: 'b5c', batchCode: 'HRD-2026-EYL-002', batchName: 'Eyl Goat & Sheep Mix', species: 'Goat', breed: 'Somali', count: 4, status: 'APPROVED', createdAt: '2026-08-01',
          animals: [
            { id: 'e8',  seq: 1, sex: 'M', ageMonths: 20, weightKg: 38, features: '',           tagStatus: 'UNTAGGED' },
            { id: 'e9',  seq: 2, sex: 'F', ageMonths: 18, weightKg: 32, features: 'Brown coat', tagStatus: 'UNTAGGED' },
            { id: 'e10', seq: 3, sex: 'F', ageMonths: 14, weightKg: 26, features: '',           tagStatus: 'UNTAGGED' },
            { id: 'e11', seq: 4, sex: 'F', ageMonths: 12, weightKg: 22, features: '',           tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
  ],

  hiiraan: [
    {
      id: 'prm5', code: 'SOM-HIR-003', name: 'Beledweyne Cattle Ranch',
      owner: 'Omar Duale', phone: '+252 61 488 7766', type: 'Ranch', status: 'APPROVED', lat: 4.7338, lng: 45.2038,
      batches: [
        { id: 'b6', batchCode: 'HRD-2026-HIR-001', batchName: 'Beledweyne Zebu Herd', species: 'Cattle', breed: 'Somali Zebu', count: 6, status: 'APPROVED', createdAt: '2026-07-05',
          animals: [
            { id: 'f1', seq: 1, sex: 'M', ageMonths: 48, weightKg: 340, features: 'Large horns',  animalId: '9004000601', tagSerial: '9004000601', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'f2', seq: 2, sex: 'M', ageMonths: 36, weightKg: 290, features: '',             animalId: '9004000602', tagSerial: '9004000602', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'f3', seq: 3, sex: 'M', ageMonths: 30, weightKg: 260, features: 'Brown coat',  animalId: '9004000603', tagSerial: '9004000603', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'f4', seq: 4, sex: 'F', ageMonths: 40, weightKg: 230, features: '',             tagStatus: 'UNTAGGED' },
            { id: 'f5', seq: 5, sex: 'F', ageMonths: 32, weightKg: 210, features: 'White spot',  tagStatus: 'UNTAGGED' },
            { id: 'f6', seq: 6, sex: 'F', ageMonths: 24, weightKg: 190, features: '',             tagStatus: 'UNTAGGED' },
          ],
        },
        { id: 'b6b', batchCode: 'HRD-2026-HIR-004', batchName: 'Hiiraan Sheep Lot', species: 'Sheep', breed: 'Somali Blackhead', count: 3, status: 'SUBMITTED', createdAt: '2026-08-05',
          animals: [
            { id: 'f7', seq: 1, sex: 'M', ageMonths: 20, weightKg: 38, features: '',            tagStatus: 'UNTAGGED' },
            { id: 'f8', seq: 2, sex: 'F', ageMonths: 16, weightKg: 30, features: 'Black head',  tagStatus: 'UNTAGGED' },
            { id: 'f9', seq: 3, sex: 'F', ageMonths: 14, weightKg: 26, features: '',            tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
  ],

  mudug: [
    {
      id: 'prm6', code: 'SOM-MUD-008', name: 'Galkayo Livestock Centre',
      owner: 'Ifrah Mohamed', phone: '+252 61 322 4455', type: 'Livestock Yard', status: 'APPROVED', lat: 6.7740, lng: 47.4338,
      batches: [
        { id: 'b7', batchCode: 'HRD-2026-GAL-001', batchName: 'Galkayo Camel Lot', species: 'Camel', breed: 'Somali Dromedary', count: 5, status: 'TAGGED', createdAt: '2026-06-28',
          animals: [
            { id: 'g1', seq: 1, sex: 'M', ageMonths: 96, weightKg: 560, features: 'Very tall',  animalId: '9005000701', tagSerial: '9005000701', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'g2', seq: 2, sex: 'M', ageMonths: 72, weightKg: 490, features: '',           animalId: '9005000702', tagSerial: '9005000702', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'g3', seq: 3, sex: 'F', ageMonths: 60, weightKg: 420, features: 'Light coat', animalId: '9005000703', tagSerial: '9005000703', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'g4', seq: 4, sex: 'F', ageMonths: 48, weightKg: 380, features: '',           animalId: '9005000704', tagSerial: '9005000704', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'g5', seq: 5, sex: 'F', ageMonths: 36, weightKg: 340, features: '',           animalId: '9005000705', tagSerial: '9005000705', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
          ],
        },
      ],
    },
    {
      id: 'prm6b', code: 'SOM-MUD-012', name: 'Hobyo Pastoral Camp',
      owner: 'Abdiqadir Yusuf', phone: '+252 61 411 6699', type: 'Pastoral Camp', status: 'APPROVED', lat: 5.3493, lng: 48.5249,
      batches: [
        { id: 'b7b', batchCode: 'HRD-2026-HOB-003', batchName: 'Hobyo Goat Herd', species: 'Goat', breed: 'Somali', count: 4, status: 'APPROVED', createdAt: '2026-07-30',
          animals: [
            { id: 'g6', seq: 1, sex: 'M', ageMonths: 22, weightKg: 40, features: '',            tagStatus: 'UNTAGGED' },
            { id: 'g7', seq: 2, sex: 'M', ageMonths: 18, weightKg: 34, features: 'Dark coat',  tagStatus: 'UNTAGGED' },
            { id: 'g8', seq: 3, sex: 'F', ageMonths: 16, weightKg: 28, features: '',            tagStatus: 'UNTAGGED' },
            { id: 'g9', seq: 4, sex: 'F', ageMonths: 14, weightKg: 24, features: '',            tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
  ],

  sanaag: [
    {
      id: 'prm7', code: 'SOM-SAN-005', name: 'Erigavo Highland Ranch',
      owner: 'Zamzam Hirsi', phone: '+252 63 201 5544', type: 'Ranch', status: 'APPROVED', lat: 10.6197, lng: 47.3718,
      batches: [
        { id: 'b8', batchCode: 'HRD-2026-ERI-002', batchName: 'Erigavo Sheep Flock', species: 'Sheep', breed: 'Somali Blackhead', count: 7, status: 'APPROVED', createdAt: '2026-07-12',
          animals: [
            { id: 'h1', seq: 1, sex: 'M', ageMonths: 24, weightKg: 44, features: 'Large', animalId: '9006000801', tagSerial: '9006000801', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'h2', seq: 2, sex: 'M', ageMonths: 20, weightKg: 40, features: '',      animalId: '9006000802', tagSerial: '9006000802', tagType: 'EAR_TAG', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'h3', seq: 3, sex: 'F', ageMonths: 18, weightKg: 34, features: '',      tagStatus: 'UNTAGGED' },
            { id: 'h4', seq: 4, sex: 'F', ageMonths: 16, weightKg: 30, features: '',      tagStatus: 'UNTAGGED' },
            { id: 'h5', seq: 5, sex: 'F', ageMonths: 14, weightKg: 26, features: '',      tagStatus: 'UNTAGGED' },
            { id: 'h6', seq: 6, sex: 'F', ageMonths: 12, weightKg: 22, features: '',      tagStatus: 'UNTAGGED' },
            { id: 'h7', seq: 7, sex: 'F', ageMonths: 10, weightKg: 18, features: '',      tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
  ],

  galgaduud: [
    {
      id: 'prm8', code: 'SOM-GAL-006', name: 'Dhuusamarreeb Farm',
      owner: 'Hassan Warsame', phone: '+252 61 566 8800', type: 'Farm', status: 'APPROVED', lat: 5.3528, lng: 46.3918,
      batches: [
        { id: 'b9', batchCode: 'HRD-2026-DHU-001', batchName: 'Dhuusamarreeb Cattle', species: 'Cattle', breed: 'Somali Zebu', count: 4, status: 'APPROVED', createdAt: '2026-07-22',
          animals: [
            { id: 'i1', seq: 1, sex: 'M', ageMonths: 40, weightKg: 300, features: 'Grey coat',  tagStatus: 'UNTAGGED' },
            { id: 'i2', seq: 2, sex: 'M', ageMonths: 36, weightKg: 280, features: '',            tagStatus: 'UNTAGGED' },
            { id: 'i3', seq: 3, sex: 'F', ageMonths: 30, weightKg: 220, features: '',            tagStatus: 'UNTAGGED' },
            { id: 'i4', seq: 4, sex: 'F', ageMonths: 26, weightKg: 200, features: 'White blaze', tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
  ],

  bakool: [
    {
      id: 'prm9', code: 'SOM-BAK-002', name: 'Xuddur Pastoral Station',
      owner: 'Barni Isaaq', phone: '+252 61 700 4422', type: 'Pastoral Camp', status: 'APPROVED', lat: 4.1204, lng: 43.8868,
      batches: [
        { id: 'b10', batchCode: 'HRD-2026-XUD-001', batchName: 'Xuddur Goat Herd', species: 'Goat', breed: 'Somali', count: 5, status: 'SUBMITTED', createdAt: '2026-08-06',
          animals: [
            { id: 'j1', seq: 1, sex: 'M', ageMonths: 26, weightKg: 44, features: '',             tagStatus: 'UNTAGGED' },
            { id: 'j2', seq: 2, sex: 'M', ageMonths: 22, weightKg: 40, features: 'Brown coat',   tagStatus: 'UNTAGGED' },
            { id: 'j3', seq: 3, sex: 'F', ageMonths: 18, weightKg: 32, features: '',             tagStatus: 'UNTAGGED' },
            { id: 'j4', seq: 4, sex: 'F', ageMonths: 16, weightKg: 28, features: '',             tagStatus: 'UNTAGGED' },
            { id: 'j5', seq: 5, sex: 'F', ageMonths: 14, weightKg: 24, features: 'White patch',  tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
  ],

  woqooyi: [
    {
      id: 'prm10', code: 'SOM-WOQ-001', name: 'Hargeisa Central Farm',
      owner: 'Khadija Omar', phone: '+252 63 400 1122', type: 'Farm', status: 'APPROVED', lat: 9.5600, lng: 44.0650,
      batches: [
        { id: 'b11', batchCode: 'HRD-2026-HRG-001', batchName: 'Hargeisa Cattle Herd', species: 'Cattle', breed: 'Somali Zebu', count: 4, status: 'TAGGED', createdAt: '2026-07-08',
          animals: [
            { id: 'k1', seq: 1, sex: 'M', ageMonths: 42, weightKg: 310, features: '',            animalId: '9007001101', tagSerial: '9007001101', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'k2', seq: 2, sex: 'M', ageMonths: 38, weightKg: 290, features: 'Long horns',  animalId: '9007001102', tagSerial: '9007001102', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'k3', seq: 3, sex: 'F', ageMonths: 30, weightKg: 240, features: '',            animalId: '9007001103', tagSerial: '9007001103', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
            { id: 'k4', seq: 4, sex: 'F', ageMonths: 26, weightKg: 215, features: 'White coat',  animalId: '9007001104', tagSerial: '9007001104', tagType: 'RFID', tagColor: 'yellow', tagStatus: 'TAGGED' },
          ],
        },
        { id: 'b11b', batchCode: 'HRD-2026-HRG-003', batchName: 'Hargeisa Camel Group', species: 'Camel', breed: 'Somali Dromedary', count: 3, status: 'APPROVED', createdAt: '2026-07-25',
          animals: [
            { id: 'k5', seq: 1, sex: 'M', ageMonths: 80, weightKg: 510, features: 'Sand colour', tagStatus: 'UNTAGGED' },
            { id: 'k6', seq: 2, sex: 'F', ageMonths: 60, weightKg: 430, features: '',             tagStatus: 'UNTAGGED' },
            { id: 'k7', seq: 3, sex: 'F', ageMonths: 48, weightKg: 390, features: '',             tagStatus: 'UNTAGGED' },
          ],
        },
      ],
    },
  ],

};

// ── Status sets ────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES    = new Set(['TAGGED', 'APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING', 'ACTIVE']);
const COMPLETED_STATUSES = new Set(['COMPLETED', 'CLOSED', 'EXPORTED', 'SLAUGHTERED', 'CANCELLED']);

// ── Helpers ────────────────────────────────────────────────────────────────────

const SPECIES_EMOJI: Record<string, string> = { Cattle: '🐄', Camel: '🐪', Goat: '🐐', Sheep: '🐑' };

const SPECIES_PIC: Record<string, { emoji: string; bg: string }> = {
  Cattle:  { emoji: '🐄', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' },
  Camel:   { emoji: '🐪', bg: 'linear-gradient(135deg, #fef9c3 0%, #fde047 100%)' },
  Sheep:   { emoji: '🐑', bg: 'linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)' },
  Goat:    { emoji: '🐐', bg: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)' },
  default: { emoji: '🐾', bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Tag SVG components ─────────────────────────────────────────────────────────

function RFIDTag({ serial, color = 'yellow' }: { serial?: string; color?: TagColor }) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string; sub: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917', sub: '#422006' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12', sub: '#9a3412' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d', sub: '#166534' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a', sub: '#1e40af' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d', sub: '#991b1b' },
  };
  const c = fills[color] ?? fills.yellow;
  return (
    <svg width="100" height="90" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <rect x="14" y="27" width="18" height="13" rx="2" fill="rgba(0,0,0,0.3)" />
      <rect x="16" y="29" width="14" height="9" rx="1" fill="#1e293b" />
      <path d="M76,28 Q81,34 76,40" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M81,25 Q89,34 81,43" fill="none" stroke={c.sub} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <text x="55" y="57" fontSize="6.5" fill={c.sub} fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">ID NUMBER</text>
      <text x="55" y="70" fontSize="11" fill={c.text} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{(serial ?? 'UNASSIGNED').slice(-10)}</text>
    </svg>
  );
}

function EarTag({ serial, color = 'yellow' }: { serial?: string; color?: TagColor }) {
  const fills: Record<TagColor, { body: string; stroke: string; text: string }> = {
    yellow: { body: '#eab308', stroke: '#713f12', text: '#1c1917' },
    orange: { body: '#fed7aa', stroke: '#f97316', text: '#7c2d12' },
    green:  { body: '#bbf7d0', stroke: '#16a34a', text: '#14532d' },
    blue:   { body: '#bfdbfe', stroke: '#3b82f6', text: '#1e3a8a' },
    red:    { body: '#fecaca', stroke: '#ef4444', text: '#7f1d1d' },
  };
  const c = fills[color] ?? fills.yellow;
  return (
    <svg width="100" height="90" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#e5e7eb" stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <text x="55" y="57" fontSize="6.5" fill={c.text} fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">EAR TAG</text>
      <text x="55" y="70" fontSize="11" fill={c.text} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{(serial ?? 'PENDING').slice(-10)}</text>
    </svg>
  );
}

function UnassignedTag() {
  return (
    <svg width="100" height="90" viewBox="0 0 110 100" style={{ display: 'block' }}>
      <rect x="40" y="2" width="30" height="18" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="55" cy="11" r="4.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      <circle cx="55" cy="11" r="2" fill="white" />
      <rect x="2" y="14" width="106" height="84" rx="14" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 3" />
      <text x="55" y="62" fontSize="8" fill="#cbd5e1" fontFamily="monospace" fontWeight="bold" textAnchor="middle">UNTAGGED</text>
    </svg>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type PremisesItem = Premises & { regionId: string; regionName: string };

export function PremisesPage(): JSX.Element {
  const navigate = useNavigate();
  const { regionCode } = useAuthStore();

  const [premisesList,      setPremisesList]      = useState<PremisesItem[]>([]);
  const [loadingPremises,   setLoadingPremises]   = useState(true);
  const [loadingBatches,    setLoadingBatches]    = useState(false);
  const [loadingAnimals,    setLoadingAnimals]    = useState(false);
  const [selectedPremises,  setSelectedPremises]  = useState<PremisesItem | null>(null);
  const [selectedBatch,     setSelectedBatch]     = useState<Batch | null>(null);
  const [batchTab,          setBatchTab]          = useState<'active' | 'completed' | 'all'>('active');
  const [showMap,           setShowMap]           = useState(false);
  const [regDrawer,         setRegDrawer]         = useState<PremisesItem | null>(null);

  const regionMeta  = regionCode ? REGIONS.find(r => r.code === regionCode) : null;
  const areaLabel   = regionMeta?.name ?? (regionCode ?? 'All Territories');
  const regionLabel = regionMeta?.name ?? (regionCode ?? 'Unknown Region');

  useEffect(() => {
    if (!regionCode) { setLoadingPremises(false); return; }
    supabase.rpc('get_premises_by_region', { p_region_code: regionCode })
      .then(({ data, error }) => {
        if (error) { console.error('[premises]', error); return; }
        setPremisesList((data ?? []).map((r: Record<string, unknown>) => ({
          id:         r.id as string,
          code:       r.premises_code as string,
          name:       r.premises_name as string,
          owner:      (r.owner_name as string) ?? 'Unknown',
          phone:      (r.owner_phone as string) ?? '—',
          type:       r.premises_type as string,
          status:     r.status as string,
          lat:         r.gps_latitude  ? Number(r.gps_latitude)  : undefined,
          lng:         r.gps_longitude ? Number(r.gps_longitude) : undefined,
          batches:     [],
          cattleCount: Number(r.cattle_count ?? 0),
          camelCount:  Number(r.camel_count  ?? 0),
          sheepCount:  Number(r.sheep_count  ?? 0),
          goatCount:   Number(r.goat_count   ?? 0),
          regionId:    regionCode,
          regionName:  regionLabel,
        })));
      })
      .finally(() => setLoadingPremises(false));
  }, [regionCode]);

  const visiblePremises = premisesList;

  async function openPremises(p: PremisesItem) {
    setSelectedPremises({ ...p, batches: [] });
    setSelectedBatch(null);
    setBatchTab('active');
    setLoadingBatches(true);
    const { data } = await supabase.rpc('get_batches_by_premises_code', { p_premises_code: p.code });
    const batches: Batch[] = (data ?? []).map((b: Record<string, unknown>) => ({
      id:        b.id as string,
      batchCode: b.batch_code as string,
      batchName: b.batch_name as string,
      species:   b.species as string,
      breed:     (b.breed as string) ?? '',
      count:     Number(b.count),
      status:    b.status as string,
      createdAt: b.created_at as string,
      animals:   [],
    }));
    setSelectedPremises(prev => prev ? { ...prev, batches } : prev);
    setLoadingBatches(false);
  }

  async function openBatch(batch: Batch) {
    setSelectedBatch({ ...batch, animals: [] });
    setLoadingAnimals(true);
    const { data } = await supabase.rpc('get_animals_by_batch', { p_batch_id: batch.id });
    const animals: BatchAnimal[] = (data ?? []).map((a: Record<string, unknown>, i: number) => ({
      id:        a.id as string,
      seq:       (a.seq as number) ?? (i + 1),
      sex:       (a.sex as 'M' | 'F') ?? 'M',
      ageMonths: (a.age_months as number) ?? 0,
      weightKg:  (a.weight_kg as number) ?? 0,
      features:  (a.distinguishing_marks as string) ?? '',
      animalId:  (a.animal_code as string) ?? undefined,
      tagSerial: (a.tag_serial as string) ?? undefined,
      tagType:   (a.tag_type as 'RFID' | 'EAR_TAG') ?? undefined,
      tagColor:  (a.tag_color as TagColor) ?? undefined,
      tagStatus: (a.tag_status as string) === 'TAGGED' ? 'TAGGED' : 'UNTAGGED',
    }));
    setSelectedBatch({ ...batch, animals });
    setLoadingAnimals(false);
  }

  function goBackFromBatch()    { setSelectedBatch(null); }
  function goBackFromPremises() { setSelectedPremises(null); setSelectedBatch(null); }

  // ── Level 2: Animal grid ──────────────────────────────────────────────────

  if (selectedBatch) {
    return (
      <div className={s.page}>
        <div className={s.breadcrumb}>
          <span className={s.crumbLink} onClick={goBackFromPremises}>Premises</span>
          <ChevronRight size={12} className={s.crumbSep} />
          <span className={s.crumbLink} onClick={goBackFromBatch}>{selectedPremises?.name}</span>
          <ChevronRight size={12} className={s.crumbSep} />
          <span className={s.crumbActive}>{selectedBatch.batchCode}</span>
        </div>

        <button className={s.backBtn} onClick={goBackFromBatch}>
          <ArrowLeft size={14} /> Back to batches
        </button>

        <div className={s.levelHeader}>
          <div className={s.levelHeaderIcon}>{SPECIES_EMOJI[selectedBatch.species] ?? '🐾'}</div>
          <div className={s.levelHeaderText}>
            <div className={s.levelTitle}>{selectedBatch.batchName}</div>
            <div className={s.levelSub}>
              <span className={s.pill}>{selectedBatch.species}</span>
              <span className={s.pill}>{selectedBatch.breed}</span>
              <span className={s.pill}>{selectedBatch.count} animals</span>
              <span className={s.pill}>Registered {fmtDate(selectedBatch.createdAt)}</span>
            </div>
          </div>
          {(() => {
            const b = getBadge(selectedBatch.status);
            return <span className={s.statusBadge} style={{ background: b.bg, color: b.color }}>{b.label}</span>;
          })()}
        </div>

        {loadingAnimals && <div className={s.emptyState}>Loading animals…</div>}
        {!loadingAnimals && selectedBatch.animals.length === 0 && (
          <div className={s.emptyState}>No animals recorded in this batch.</div>
        )}
        <div className={s.animalGrid}>
          {selectedBatch.animals.map(a => {
            const isClickable = Boolean(a.animalId);
            const tag = a.tagStatus === 'TAGGED'
              ? (a.tagType === 'RFID'
                  ? <RFIDTag serial={a.tagSerial} color={a.tagColor} />
                  : <EarTag serial={a.tagSerial} color={a.tagColor} />)
              : <UnassignedTag />;
            const pic = SPECIES_PIC[selectedBatch.species] ?? SPECIES_PIC['default'];
            return (
              <div
                key={a.id}
                className={`${s.animalCard} ${isClickable ? s.animalCardClickable : ''}`}
                onClick={() => isClickable && navigate(`/animals/profile/${a.id}`)}
              >
                {/* Animal picture */}
                {a.photoUrl ? (
                  <img
                    src={a.photoUrl}
                    alt={`Animal #${a.seq}`}
                    className={s.animalPhoto}
                    style={{ objectFit: 'cover' }}
                    onError={e => {
                      const el = e.currentTarget;
                      el.style.display = 'none';
                      el.nextElementSibling?.removeAttribute('hidden');
                    }}
                  />
                ) : null}
                <div
                  className={s.animalPhoto}
                  style={{ background: pic.bg, display: a.photoUrl ? 'none' : 'flex' }}
                  hidden={!!a.photoUrl}
                >
                  <span className={s.animalPhotoEmoji}>{pic.emoji}</span>
                </div>

                <div className={s.animalCardTop}>
                  <span className={s.animalSeq}>#{a.seq}</span>
                  <span className={`${s.sexBadge} ${a.sex === 'M' ? s.sexM : s.sexF}`}>
                    {a.sex === 'M' ? '♂ M' : '♀ F'}
                  </span>
                </div>
                <div className={s.tagWrap}>{tag}</div>
                <div className={s.animalMeta}>
                  {a.ageMonths} mo · {a.weightKg} kg{a.features ? ` · ${a.features}` : ''}
                </div>
                {a.animalId
                  ? <div className={s.animalId}>{a.animalId}</div>
                  : <div className={s.untaggedLabel}>Untagged</div>
                }
                {isClickable && <div className={s.viewProfile}>View Profile →</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Level 1: Premises detail ──────────────────────────────────────────────

  if (selectedPremises) {
    const pBadge           = getBadge(selectedPremises.status);
    const activeBatches    = selectedPremises.batches.filter(b => ACTIVE_STATUSES.has(b.status));
    const completedBatches = selectedPremises.batches.filter(b => COMPLETED_STATUSES.has(b.status));
    const shownBatches     = batchTab === 'active' ? activeBatches
                           : batchTab === 'completed' ? completedBatches
                           : selectedPremises.batches;

    return (
      <div className={s.page}>
        <div className={s.breadcrumb}>
          <span className={s.crumbLink} onClick={goBackFromPremises}>Premises</span>
          <ChevronRight size={12} className={s.crumbSep} />
          <span className={s.crumbActive}>{selectedPremises.name}</span>
        </div>

        <button className={s.backBtn} onClick={goBackFromPremises}>
          <ArrowLeft size={14} /> Back to premises
        </button>

        <div className={s.detailLayout}>

          {/* ── Left column ── */}
          <div className={s.detailLeft}>

            {/* Premises info card */}
            <div className={s.premisesDetail}>
              <div className={s.sectionHeading}>Premises Details</div>
              <div className={s.premisesDetailHeader}>
                <div className={s.premisesDetailTitleRow}>
                  <span className={s.premisesDetailName}>{selectedPremises.name}</span>
                  <span className={s.statusBadge} style={{ background: pBadge.bg, color: pBadge.color }}>
                    {pBadge.label}
                  </span>
                </div>
                <div className={s.premisesDetailCode}>{selectedPremises.code}</div>
              </div>
              <div className={s.premisesDetailBody}>
                <div className={s.detailRow}>
                  <User size={13} className={s.detailIcon} />
                  <span className={s.detailLabel}>Owner</span>
                  <span>{selectedPremises.owner}</span>
                </div>
                <div className={s.detailRow}>
                  <Phone size={13} className={s.detailIcon} />
                  <span className={s.detailLabel}>Phone</span>
                  <span>{selectedPremises.phone}</span>
                </div>
                <div className={s.detailRow}>
                  <Building2 size={13} className={s.detailIcon} />
                  <span className={s.detailLabel}>Type</span>
                  <span>{selectedPremises.type}</span>
                </div>
                <div className={s.detailRow}>
                  <MapPin size={13} className={s.detailIcon} />
                  <span className={s.detailLabel}>Region</span>
                  <span>{selectedPremises.regionName}</span>
                </div>
              </div>
            </div>

            {/* Batch list */}
            <div className={s.batchSectionTitle}>Animal Batches</div>

            {loadingBatches && <div className={s.emptyState}>Loading batches…</div>}

            <div className={s.batchTabBar}>
              <button className={`${s.batchTabBtn} ${batchTab === 'active' ? s.batchTabActive : ''}`} onClick={() => setBatchTab('active')}>
                Active <span className={s.batchTabCount}>{activeBatches.length}</span>
              </button>
              <button className={`${s.batchTabBtn} ${batchTab === 'completed' ? s.batchTabActive : ''}`} onClick={() => setBatchTab('completed')}>
                Completed <span className={s.batchTabCount}>{completedBatches.length}</span>
              </button>
              <button className={`${s.batchTabBtn} ${batchTab === 'all' ? s.batchTabActive : ''}`} onClick={() => setBatchTab('all')}>
                All <span className={s.batchTabCount}>{selectedPremises.batches.length}</span>
              </button>
            </div>

            {shownBatches.length === 0 ? (
              <div className={s.emptyState}>No {batchTab === 'all' ? '' : batchTab} batches on this premises.</div>
            ) : (
              <div className={s.batchList}>
                {shownBatches.map(batch => {
                  const b = getBadge(batch.status);
                  return (
                    <button key={batch.id} className={s.batchCard} onClick={() => void openBatch(batch)}>
                      <span className={s.batchEmoji}>{SPECIES_EMOJI[batch.species] ?? '🐾'}</span>
                      <div className={s.batchBodyText}>
                        <div className={s.batchName}>{batch.batchName}</div>
                        <div className={s.batchCode}>{batch.batchCode}</div>
                        <div className={s.batchBreed}>{batch.species} · {batch.breed}</div>
                      </div>
                      <div className={s.batchRight}>
                        <span className={s.statusBadge} style={{ background: b.bg, color: b.color }}>{b.label}</span>
                        <span className={s.batchStat}><strong>{batch.count}</strong> animals · {fmtDate(batch.createdAt)}</span>
                      </div>
                      <ChevronRight size={14} className={s.batchChevron} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Map panel ── */}
          <div className={s.mapPanel}>
            <div className={s.mapHeading}>
              <Map size={14} className={s.mapHeadingIcon} />
              Location — {selectedPremises.name}
            </div>
            {selectedPremises.lat && selectedPremises.lng ? (
              <div style={{ height: 300 }}>
                <PremisesMap
                  points={[{
                    id: selectedPremises.id,
                    name: selectedPremises.name,
                    code: selectedPremises.code,
                    lat: selectedPremises.lat,
                    lng: selectedPremises.lng,
                    animalCount: selectedPremises.batches.reduce((s, b) => s + b.count, 0),
                    type: selectedPremises.type,
                  }]}
                  height="300px"
                />
              </div>
            ) : (
              <div className={s.mapNoCoords}>No coordinates recorded for this premises.</div>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ── Level 0: Premises list ────────────────────────────────────────────────

  const mapPoints = visiblePremises
    .filter(p => p.lat && p.lng)
    .map(p => ({
      id: p.id, name: p.name, code: p.code,
      lat: p.lat!, lng: p.lng!, animalCount: 0, type: p.type,
    }));

  if (loadingPremises) {
    return (
      <div className={s.page}>
        <div className={s.emptyState}><span>Loading premises…</span></div>
      </div>
    );
  }

  return (
    <div className={s.page}>

      <div className={s.pageHeadingRow}>
        <div className={s.pageHeading}>
          <h1 className={s.pageTitle}>Premises — {areaLabel}</h1>
          <div className={s.pageSub}>
            {visiblePremises.length} registered premises in your area
          </div>
        </div>
        <button
          className={`${s.mapToggleBtn} ${showMap ? s.mapToggleActive : ''}`}
          onClick={() => setShowMap(v => !v)}
        >
          <Map size={14} />
          {showMap ? 'List View' : 'Map View'}
        </button>
      </div>

      {visiblePremises.length === 0 ? (
        <div className={s.emptyState}>
          <Building2 size={40} className={s.emptyIcon} />
          <span>No premises registered in your area.</span>
        </div>
      ) : showMap ? (

        /* ── Map view ── */
        <div className={s.fullMapPanel}>
          {mapPoints.length > 0
            ? <PremisesMap points={mapPoints} height="calc(100vh - 220px)" />
            : <div className={s.mapNoCoords}>No coordinates available for this area.</div>
          }
        </div>

      ) : (

        /* ── Card view ── */
        <div className={s.premisesList}>
          {visiblePremises.map(p => {
            const b = getBadge(p.status);
            const SPECIES = [
              { key: 'Cattle', emoji: '🐄', label: 'Cattle', count: p.cattleCount ?? 0 },
              { key: 'Camel',  emoji: '🐪', label: 'Camel',  count: p.camelCount  ?? 0 },
              { key: 'Sheep',  emoji: '🐑', label: 'Sheep',  count: p.sheepCount  ?? 0 },
              { key: 'Goat',   emoji: '🐐', label: 'Goat',   count: p.goatCount   ?? 0 },
            ];
            return (
              <button key={p.id} className={s.premisesCard} onClick={() => void openPremises(p)}>
                <div className={s.premisesCardTop}>
                  <div className={s.premisesIdLabel}>Premises ID</div>
                  <div className={s.premisesCode}>{p.code}</div>
                  <div className={s.premisesName}>{p.name}</div>
                </div>

                <div className={s.speciesRow}>
                  {SPECIES.map(sp => (
                    <div key={sp.key} className={s.speciesCell}>
                      <span className={s.speciesEmoji}>{sp.emoji}</span>
                      <span className={s.speciesCount}>{sp.count}</span>
                      <span className={s.speciesLabel}>{sp.label}</span>
                    </div>
                  ))}
                </div>

                <div className={s.premisesCardFooter}>
                  <div className={s.premisesCardMeta}>
                    {!regionCode && <span className={s.pill}>{p.regionName}</span>}
                    <span className={s.pill}>{p.type.replace(/_/g, ' ')}</span>
                    <span className={s.statusBadge} style={{ background: b.bg, color: b.color }}>{b.label}</span>
                  </div>
                  <span
                    className={s.premisesViewBtn}
                    onClick={e => { e.stopPropagation(); setRegDrawer(p); }}
                  >View →</span>
                </div>
              </button>
            );
          })}
        </div>

      )}

      {/* ── Registration modal ── */}
      {regDrawer && (() => {
        const p = regDrawer;
        const badge = getBadge(p.status);

        return (
          <>
            <div className={s.modalOverlay} onClick={() => setRegDrawer(null)} />
            <div className={s.regModal}>

              {/* Header */}
              <div className={s.regModalHead}>
                <div className={s.regModalHeadLeft}>
                  <div className={s.regModalName}>{p.name}</div>
                  <div className={s.regModalSub}>{p.type} · {p.regionName}</div>
                </div>
                <div className={s.regModalHeadRight}>
                  <div className={s.regModalIdBlock}>
                    <span className={s.regModalIdLabel}>Premises ID</span>
                    <span className={s.regModalId}>{p.code}</span>
                  </div>
                  <button className={s.regModalXBtn} onClick={() => setRegDrawer(null)}>✕</button>
                </div>
              </div>

              {/* Stats strip */}
              <div className={s.regModalStats}>
                <div className={s.regModalStat}>
                  <span className={s.statusBadge} style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                  <span className={s.regModalStatLbl}>Status</span>
                </div>
              </div>

              {/* Body */}
              <div className={s.regModalBody}>

                {/* Left: info sections */}
                <div className={s.regModalLeft}>

                  <div className={s.regModalSection}>
                    <div className={s.regModalSectionTitle}>Basic Information</div>
                    <div className={s.regModalRow}><span className={s.regModalLbl}>Name</span><span className={s.regModalVal}>{p.name}</span></div>
                    <div className={s.regModalRow}><span className={s.regModalLbl}>Type</span><span className={s.regModalVal}>{p.type}</span></div>
                    <div className={s.regModalRow}><span className={s.regModalLbl}>Region</span><span className={s.regModalVal}>{p.regionName}</span></div>
                  </div>

                  <div className={s.regModalSection}>
                    <div className={s.regModalSectionTitle}>Owner Details</div>
                    <div className={s.regModalRow}><span className={s.regModalLbl}>Owner</span><span className={s.regModalVal}>{p.owner}</span></div>
                    <div className={s.regModalRow}><span className={s.regModalLbl}>Phone</span><span className={s.regModalVal}>{p.phone}</span></div>
                  </div>

                  <div className={s.regModalSection}>
                    <div className={s.regModalSectionTitle}>Livestock Details</div>
                    <div className={s.regModalRow}>
                      <span className={s.regModalLbl}>Animals</span>
                      <span className={s.regModalVal}>Click "View Batches" to load</span>
                    </div>
                  </div>

                  {(p.lat || p.lng) && (
                    <div className={s.regModalSection}>
                      <div className={s.regModalSectionTitle}>GPS Location</div>
                      <div className={s.regModalRow}><span className={s.regModalLbl}>Latitude</span><span className={s.regModalVal}>{p.lat?.toFixed(6) ?? '—'}°N</span></div>
                      <div className={s.regModalRow}><span className={s.regModalLbl}>Longitude</span><span className={s.regModalVal}>{p.lng?.toFixed(6) ?? '—'}°E</span></div>
                    </div>
                  )}

                </div>

                {/* Right: map */}
                <div className={s.regModalRight}>
                  {p.lat && p.lng ? (
                    <PremisesMap
                      points={[{ id: p.id, name: p.name, code: p.code, lat: p.lat, lng: p.lng, animalCount: 0, type: p.type }]}
                      height="220px"
                    />
                  ) : (
                    <div className={s.regModalNoMap}>No GPS coordinates recorded</div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className={s.regModalFooter}>
                <button className={s.regModalCancelBtn} onClick={() => setRegDrawer(null)}>Close</button>
                <button className={s.regModalViewBtn} onClick={() => { setRegDrawer(null); void openPremises(p); }}>
                  View Batches &amp; Animals →
                </button>
              </div>

            </div>
          </>
        );
      })()}
    </div>
  );
}

export default PremisesPage;
