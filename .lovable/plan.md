# Job Work: એક-એક પગલે ચાલતો workflow

## હેતુ
આખો route શરૂઆતમાં જ નહીં પસંદ કરવાનો. દરેક કામ પૂરું થાય ત્યારે જ "આગળ ક્યાં જશે?" એ પસંદ થશે. દરેક batch ક્યાં છે અને કેટલા nos તૈયાર છે એ સાફ દેખાશે.

## Flow (તમારા plan મુજબ)

```text
RAW MATERIAL IN (Inventory)
      |
   CUTTING  ---- size (MM) + nos ભરો -> stock માંથી KG/FT/MM આપોઆપ ઓછું
      |
  +---+-----------------------------+
  |                                 |
MACHINING                     LASER CUTTING (as per drawing)
(CNC / VMC / LATHE)           sheet thickness MM + sheet nos + parts nos
  |                                 |
  +--> SPARE IN                     +--> BENDING --> SPARE IN
  +--> HARDENING --> SPARE IN       +--> SPARE IN (સીધું)
          +--> NITRIDING
          +--> BLACKODISING --> SPARE IN

SPARE IN -> Machine બનાવવા માટે OUT (Order સાથે)
```

## શું બનશે
1. **Batch શરૂ કરો (Cutting):** raw material, દરેક piece નું size (MM) અને nos. કુલ લંબાઈ ગણીને stock માંથી આપોઆપ OUT થશે.
2. **"આગળ મોકલો" બટન:** દરેક પગલું પૂરું થાય એટલે ફક્ત એ જ વિકલ્પો દેખાશે જે plan મુજબ શક્ય છે (ઉપરનું ચિત્ર). Machining માં CNC / VMC / LATHE પસંદ કરવાનું. Vendor નું સૂચન તે કામ મુજબ આવશે.
3. **Laser cutting:** sheet ની જાડાઈ (MM), કેટલી sheet વપરાઈ, અને કેટલા parts નીકળ્યા એ ભરવાનું. Sheet stock માંથી OUT થશે. Drawing (ફોટો/PDF) upload કરી શકાશે અને batch સાથે સચવાશે.
4. **અર્ધું તૈયાર (partial):** દરેક પગલામાં "કેટલા nos મોકલ્યા / કેટલા તૈયાર આવ્યા" નોંધાશે. તૈયાર થયેલા nos આગળ જઈ શકશે, બાકીના ત્યાં જ "ઊભા" દેખાશે.
5. **Spare IN:** છેલ્લું પગલું પૂરું થાય એટલે તૈયાર part Spare (Inventory) માં આપોઆપ IN થશે.
6. **Machine માટે OUT:** Spare માંથી Order/Machine માટે OUT, પહેલાં જેવું જ Stock movement થી.
7. **Status બોર્ડ:** દરેક પગલું (Cutting, Machining, Laser, Bending, Hardening, Nitriding, Blackodising) માટે એક કૉલમ — ત્યાં કેટલા parts ઊભા છે અને કેટલા તૈયાર થઈ ગયા એ એક નજરે દેખાશે.

## હમણાં નહીં (પછી શક્ય)
- Drawing માંથી આપોઆપ sheet ની ગણતરી: drawing ફાઇલ વાંચીને nesting ગણવું ભરોસાપાત્ર નથી. શરૂઆતમાં part નું માપ (લંબાઈ x પહોળાઈ) અને sheet નું માપ ભરો તો અંદાજે કેટલી sheet જોઈશે એ ગણી આપીશ.

## Technical details
- New `job_work_steps` table (job_work_id, step, machine_type, vendor, qty_sent, qty_ready, started/finished dates, size_mm, sheet_mm, sheet_nos, drawing) with RLS via has_perm('jobwork',...); existing job_work keeps batch header; old `stages` jsonb left untouched.
- Allowed-next-step map in a small module; "Send next" modal; auto OUT on cutting/laser via inventory_transactions with job_work_id; auto IN to chosen spare item on finish.
- Drawing stored in a private storage bucket.
- Kanban-style status board on the Job Work page.
