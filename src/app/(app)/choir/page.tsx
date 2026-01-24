'use client';
import PageHeader from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import { Loader2, Music, Plus } from 'lucide-react';
import type { Choir } from '@/lib/types';
import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import ChoirFormDialog from './components/choir-form-dialog';


export default function ChoirListPage() {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChoir, setSelectedChoir] = useState<Choir | null>(null);

  const choirsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'choirs'), orderBy('name', 'asc')) : null
  , [firestore]);
  const { data: choirs, isLoading } = useCollection<Choir>(choirsQuery);

  const handleEdit = (choir: Choir) => {
    setSelectedChoir(choir);
    setDialogOpen(true);
  }

  const handleCreate = () => {
    setSelectedChoir(null);
    setDialogOpen(true);
  }
  
  return (
    <>
      <PageHeader
        title="Choirs"
        subtitle="Manage your school's choir groups."
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2"/>
            Create Choir
          </Button>
        }
      />
      <div className="container mx-auto p-4 md:p-8">
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {choirs && choirs.length > 0 ? choirs.map(choir => (
                   <Card key={choir.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Music className="text-primary"/> {choir.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2 h-10">{choir.description || 'No description provided.'}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                           {/* Placeholder for future stats like member count */}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={() => handleEdit(choir)}>Edit</Button>
                            <Button asChild>
                                <Link href={`/choir/${choir.id}`}>Manage Members</Link>
                            </Button>
                        </CardFooter>
                   </Card>
                )) : (
                  <div className="col-span-full text-center py-12">
                      <h3 className="text-xl font-semibold">No Choirs Found</h3>
                      <p className="text-muted-foreground mt-2">Get started by creating your first choir.</p>
                      <Button className="mt-4" onClick={handleCreate}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create a Choir
                      </Button>
                  </div>
                )}
            </div>
        )}
      </div>
      <ChoirFormDialog 
        isOpen={dialogOpen} 
        setIsOpen={setDialogOpen}
        choir={selectedChoir}
      />
    </>
  );
}
