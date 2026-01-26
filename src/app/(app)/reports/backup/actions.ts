'use server';

import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
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

        const backupData = {
            backupDate: new Date().toISOString(),
            data: {
                students: serializeData(students),
                choirs: serializeData(choirs),
                choir_members: serializeData(choirMembers),
                choir_attendance: serializeData(choir_attendance),
            }
        };

        return { success: true, data: backupData, message: 'Backup generated successfully.' };

    } catch (e: any) {
        console.error('Error during backup:', e);
        return { success: false, message: e.message || 'An unexpected error occurred during backup.' };
    }
}
