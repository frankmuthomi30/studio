'use server';

import { getFirestore, collection, getDocs, doc, writeBatch, Timestamp } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

function getDb() {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getFirestore(getApp());
}

// Function to serialize Timestamps and other non-JSON-friendly types
const serializeData = (data: any): any => {
    if (data === null || data === undefined) {
        return data;
    }
    // Firestore Timestamp
    if (typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }
    // It's an array
    if (Array.isArray(data)) {
        return data.map(serializeData);
    }
    // It's an object
    if (typeof data === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newObj[key] = serializeData(data[key]);
            }
        }
        return newObj;
    }
    return data;
};

// Helper to convert ISO strings back to Timestamps for specific keys
const unserializeData = (data: any): any => {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) return data.map(unserializeData);
    if (typeof data === 'object') {
        const newObj: any = {};
        for (const key in data) {
            const val = data[key];
            // Check if key is a date field and value is a string
            const dateKeys = ['uploaded_at', 'created_at', 'updated_at', 'date_joined', 'date', 'recorded_at', 'event_date'];
            if (dateKeys.includes(key) && typeof val === 'string' && !isNaN(Date.parse(val))) {
                newObj[key] = Timestamp.fromDate(new Date(val));
            } else if (typeof val === 'object') {
                newObj[key] = unserializeData(val);
            } else {
                newObj[key] = val;
            }
        }
        return newObj;
    }
    return data;
}


export async function backupAllData(): Promise<{ success: boolean; data?: any; message: string }> {
    const db = getDb();
    try {
        // 1. Fetch Students
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Fetch Choirs
        const choirsSnapshot = await getDocs(collection(db, 'choirs'));
        const choirs = choirsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Fetch Choir Members for each choir
        const choirMembers: Record<string, any[]> = {};
        for (const choir of choirs) {
            const membersSnapshot = await getDocs(collection(db, 'choirs', choir.id, 'members'));
            choirMembers[choir.id] = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // 4. Fetch Attendance Sessions
        const attendanceSnapshot = await getDocs(collection(db, 'choir_attendance'));
        const choir_attendance = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 5. Fetch Custom Lists
        const listsSnapshot = await getDocs(collection(db, 'custom_lists'));
        const custom_lists = listsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const backupData = {
            backupDate: new Date().toISOString(),
            data: {
                students: serializeData(students),
                choirs: serializeData(choirs),
                choir_members: serializeData(choirMembers),
                choir_attendance: serializeData(choir_attendance),
                custom_lists: serializeData(custom_lists),
            }
        };

        return { success: true, data: backupData, message: 'Backup generated successfully.' };

    } catch (e: any) {
        console.error('Error during backup:', e);
        return { success: false, message: e.message || 'An unexpected error occurred during backup.' };
    }
}

export async function restoreAllData(backupJson: any, userId: string): Promise<{ success: boolean; message: string }> {
    const db = getDb();
    const data = backupJson.data;
    if (!data) return { success: false, message: 'Invalid backup file format: Missing data object.' };

    try {
        const students = unserializeData(data.students || []);
        const choirs = unserializeData(data.choirs || []);
        const choir_members = unserializeData(data.choir_members || {});
        const choir_attendance = unserializeData(data.choir_attendance || []);
        const custom_lists = unserializeData(data.custom_lists || []);

        let operationCount = 0;
        let batch = writeBatch(db);

        const commitBatch = async () => {
            if (operationCount > 0) {
                await batch.commit();
                batch = writeBatch(db);
                operationCount = 0;
            }
        };

        const addOperation = async (ref: any, docData: any) => {
            batch.set(ref, docData);
            operationCount++;
            if (operationCount >= 450) {
                await commitBatch();
            }
        };

        // Restore Students
        for (const student of students) {
            const { id, ...sData } = student;
            await addOperation(doc(db, 'students', id), sData);
        }

        // Restore Choirs and their Sub-members
        for (const choir of choirs) {
            const { id, ...cData } = choir;
            await addOperation(doc(db, 'choirs', id), cData);
            
            const members = choir_members[id] || [];
            for (const member of members) {
                const { id: mId, ...mData } = member;
                await addOperation(doc(db, 'choirs', id, 'members', mId), mData);
            }
        }

        // Restore Attendance
        for (const session of choir_attendance) {
            const { id, ...aData } = session;
            await addOperation(doc(db, 'choir_attendance', id), aData);
        }

        // Restore Custom Lists
        for (const list of custom_lists) {
            const { id, ...lData } = list;
            await addOperation(doc(db, 'custom_lists', id), lData);
        }

        await commitBatch();

        return { success: true, message: 'Data restoration complete. All records have been merged into the database.' };
    } catch (e: any) {
        console.error('Error during restoration:', e);
        return { success: false, message: e.message || 'Restoration failed due to a database error.' };
    }
}
