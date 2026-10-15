import { useState } from 'react';
import { Search } from 'lucide-react';
import s from './animals-list.module.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FlatAnimal {
  id: string;
  seq: number;
  animalId?: string;
  tagSerial?: string;
  tagType?: 'RFID' | 'EAR_TAG';
  tagStatus: 'TAGGED' | 'UNTAGGED';
  species: string;
  breed: string;
  sex: 'M' | 'F';
  ageMonths: number;
  weightKg: number;
  features: string;
  premisesCode: string;
  premisesName: string;
  batchCode: string;
  region: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const ALL_ANIMALS: FlatAnimal[] = [
  { id: 'ba1', seq: 1, animalId: '9001000441', tagSerial: '9001000441', tagType: 'RFID',    tagStatus: 'TAGGED',   species: 'Cattle', breed: 'Somali Zebu',       sex: 'M', ageMonths: 36, weightKg: 280, features: 'White patch',  premisesCode: 'SOM-MOG-004', premisesName: 'Daynile Farm',               batchCode: 'HRD-2026-MOG-001', region: 'Banaadir'    },
  { id: 'ba2', seq: 2, animalId: '9001000442', tagSerial: '9001000442', tagType: 'RFID',    tagStatus: 'TAGGED',   species: 'Cattle', breed: 'Somali Zebu',       sex: 'M', ageMonths: 42, weightKg: 310, features: 'Brown coat',   premisesCode: 'SOM-MOG-004', premisesName: 'Daynile Farm',               batchCode: 'HRD-2026-MOG-001', region: 'Banaadir'    },
  { id: 'ba3', seq: 3, animalId: '9001000443', tagSerial: '9001000443', tagType: 'RFID',    tagStatus: 'TAGGED',   species: 'Cattle', breed: 'Somali Zebu',       sex: 'F', ageMonths: 28, weightKg: 245, features: 'Black face',   premisesCode: 'SOM-MOG-004', premisesName: 'Daynile Farm',               batchCode: 'HRD-2026-MOG-001', region: 'Banaadir'    },
  { id: 'bc1', seq: 1,                                                                        tagStatus: 'UNTAGGED', species: 'Goat',   breed: 'Somali',            sex: 'M', ageMonths: 24, weightKg:  42, features: '',             premisesCode: 'SOM-MOG-004', premisesName: 'Daynile Farm',               batchCode: 'HRD-2026-MOG-003', region: 'Banaadir'    },
  { id: 'bc2', seq: 2,                                                                        tagStatus: 'UNTAGGED', species: 'Goat',   breed: 'Somali',            sex: 'F', ageMonths: 18, weightKg:  32, features: 'Brown coat',   premisesCode: 'SOM-MOG-004', premisesName: 'Daynile Farm',               batchCode: 'HRD-2026-MOG-003', region: 'Banaadir'    },
  { id: 'bb1', seq: 1, animalId: '9001000201', tagSerial: '9001000201', tagType: 'EAR_TAG', tagStatus: 'UNTAGGED', species: 'Sheep',  breed: 'Somali Blackhead',  sex: 'M', ageMonths: 18, weightKg:  36, features: '',             premisesCode: 'SOM-BAY-011', premisesName: 'Baidoa Livestock Holdings',   batchCode: 'HRD-2026-BAY-002', region: 'Bay'         },
  { id: 'bb2', seq: 2, animalId: '9001000202', tagSerial: '9001000202', tagType: 'EAR_TAG', tagStatus: 'UNTAGGED', species: 'Sheep',  breed: 'Somali Blackhead',  sex: 'M', ageMonths: 20, weightKg:  38, features: 'Black legs',   premisesCode: 'SOM-BAY-011', premisesName: 'Baidoa Livestock Holdings',   batchCode: 'HRD-2026-BAY-002', region: 'Bay'         },
  { id: 'bb3', seq: 3, animalId: '9001000203', tagSerial: '9001000203', tagType: 'EAR_TAG', tagStatus: 'UNTAGGED', species: 'Sheep',  breed: 'Somali Blackhead',  sex: 'F', ageMonths: 16, weightKg:  30, features: '',             premisesCode: 'SOM-BAY-011', premisesName: 'Baidoa Livestock Holdings',   batchCode: 'HRD-2026-BAY-002', region: 'Bay'         },
  { id: 'bb4', seq: 4, animalId: '9001000204', tagSerial: '9001000204', tagType: 'EAR_TAG', tagStatus: 'UNTAGGED', species: 'Sheep',  breed: 'Somali Blackhead',  sex: 'F', ageMonths: 15, weightKg:  28, features: 'White blaze', premisesCode: 'SOM-BAY-011', premisesName: 'Baidoa Livestock Holdings',   batchCode: 'HRD-2026-BAY-002', region: 'Bay'         },
  { id: 'bd1', seq: 1,                                                                        tagStatus: 'UNTAGGED', species: 'Goat',   breed: 'Somali',            sex: 'M', ageMonths: 24, weightKg:  42, features: '',             premisesCode: 'SOM-JUB-004', premisesName: 'Kismayo Camel Station',      batchCode: 'HRD-2026-KIS-003', region: 'Lower Jubba' },
  { id: 'bd2', seq: 2,                                                                        tagStatus: 'UNTAGGED', species: 'Goat',   breed: 'Somali',            sex: 'F', ageMonths: 18, weightKg:  32, features: '',             premisesCode: 'SOM-JUB-004', premisesName: 'Kismayo Camel Station',      batchCode: 'HRD-2026-KIS-003', region: 'Lower Jubba' },
  { id: 'bd3', seq: 3,                                                                        tagStatus: 'UNTAGGED', species: 'Goat',   breed: 'Somali',            sex: 'F', ageMonths: 20, weightKg:  35, features: 'Brown coat',   premisesCode: 'SOM-JUB-004', premisesName: 'Kismayo Camel Station',      batchCode: 'HRD-2026-KIS-003', region: 'Lower Jubba' },
  { id: 'be1', seq: 1,                                                                        tagStatus: 'UNTAGGED', species: 'Camel',  breed: 'Somali Dromedary',  sex: 'M', ageMonths: 60, weightKg: 450, features: 'Dark brown',   premisesCode: 'SOM-GAR-002', premisesName: 'Garowe Highland Farm',        batchCode: 'HRD-2026-GAR-001', region: 'Nugaal'      },
  { id: 'be2', seq: 2,                                                                        tagStatus: 'UNTAGGED', species: 'Camel',  breed: 'Somali Dromedary',  sex: 'F', ageMonths: 48, weightKg: 380, features: '',             premisesCode: 'SOM-GAR-002', premisesName: 'Garowe Highland Farm',        batchCode: 'HRD-2026-GAR-001', region: 'Nugaal'      },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const SPECIES_LIST = ['Cattle', 'Camel', 'Goat', 'Sheep'];
const SPECIES_EMOJI: Record<string, string> = { Cattle: '🐄', Camel: '🐪', Goat: '🐐', Sheep: '🐑' };

// ── Main Page ──────────────────────────────────────────────────────────────────

export function AnimalsListPage(): JSX.Element {
  const [search, setSearch]             = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('ALL');
  const [tagFilter, setTagFilter]       = useState<'ALL' | 'TAGGED' | 'UNTAGGED'>('ALL');

  const filtered = ALL_ANIMALS.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (a.animalId ?? '').toLowerCase().includes(q) ||
      (a.tagSerial ?? '').toLowerCase().includes(q) ||
      a.species.toLowerCase().includes(q) ||
      a.premisesName.toLowerCase().includes(q) ||
      a.premisesCode.toLowerCase().includes(q) ||
      a.batchCode.toLowerCase().includes(q) ||
      a.region.toLowerCase().includes(q);
    const matchSpecies = speciesFilter === 'ALL' || a.species === speciesFilter;
    const matchTag     = tagFilter === 'ALL' || a.tagStatus === tagFilter;
    return matchSearch && matchSpecies && matchTag;
  });

  const tagged   = ALL_ANIMALS.filter(a => a.tagStatus === 'TAGGED').length;
  const untagged = ALL_ANIMALS.filter(a => a.tagStatus === 'UNTAGGED').length;

  return (
    <div className={s.page}>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Search animal ID, tag serial, premises, region…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={s.filterRow}>
          {(['ALL', ...SPECIES_LIST] as const).map(sp => (
            <button
              key={sp}
              className={`${s.filterPill} ${speciesFilter === sp ? s.filterPillOn : ''}`}
              onClick={() => setSpeciesFilter(sp)}
            >
              {sp === 'ALL' ? 'All Species' : `${SPECIES_EMOJI[sp]} ${sp}`}
            </button>
          ))}

          <span className={s.filterSep} />

          {(['ALL', 'TAGGED', 'UNTAGGED'] as const).map(t => (
            <button
              key={t}
              className={`${s.filterPill} ${tagFilter === t ? s.filterPillOn : ''}`}
              onClick={() => setTagFilter(t)}
            >
              {t === 'ALL' ? 'All Tags' : t === 'TAGGED' ? '✓ Tagged' : '○ Untagged'}
            </button>
          ))}
        </div>

        <div className={s.statsRow}>
          <span className={s.statChip}>{ALL_ANIMALS.length} total</span>
          <span className={s.statChipGreen}>{tagged} tagged</span>
          <span className={s.statChipGrey}>{untagged} untagged</span>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Animal ID</th>
              <th>Species / Breed</th>
              <th>Sex</th>
              <th>Age</th>
              <th>Weight</th>
              <th>Tag</th>
              <th>Premises</th>
              <th>Batch</th>
              <th>Region</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={a.id} className={s.row}>
                <td className={s.tdSeq}>{i + 1}</td>
                <td className={s.tdId}>{a.animalId ?? <span className={s.dash}>—</span>}</td>
                <td className={s.tdSpecies}>
                  <span>{SPECIES_EMOJI[a.species]} {a.species}</span>
                  <span className={s.breed}>{a.breed}</span>
                </td>
                <td>
                  <span className={`${s.sexBadge} ${a.sex === 'M' ? s.sexM : s.sexF}`}>
                    {a.sex === 'M' ? '♂ M' : '♀ F'}
                  </span>
                </td>
                <td className={s.tdMeta}>{a.ageMonths} mo</td>
                <td className={s.tdMeta}>{a.weightKg} kg</td>
                <td>
                  {a.tagStatus === 'TAGGED'
                    ? <span className={s.taggedBadge}>{a.tagType}</span>
                    : <span className={s.untaggedBadge}>Untagged</span>}
                </td>
                <td className={s.tdPremises}>
                  <span className={s.premisesName}>{a.premisesName}</span>
                  <span className={s.premisesCode}>{a.premisesCode}</span>
                </td>
                <td className={s.tdBatch}>{a.batchCode}</td>
                <td className={s.tdMeta}>{a.region}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className={s.empty}>No animals match the current filters.</div>
        )}
      </div>
    </div>
  );
}

export default AnimalsListPage;
