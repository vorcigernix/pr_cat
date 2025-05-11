'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Category } from '@/lib/types'; // Assuming Category type is available
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea'; // Changed path to be consistent with other local shadcn imports
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from './dialog';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';

interface OrganizationCategoryManagerProps {
  organizationId: number;
  organizationName: string;
}

export function OrganizationCategoryManager({
  organizationId,
  organizationName,
}: OrganizationCategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for Add Category Dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null);

  // Edit Category Dialog States
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDescription, setEditCategoryDescription] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('');
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [editCategoryError, setEditCategoryError] = useState<string | null>(null);

  // Delete Category Confirmation Dialog States
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [deleteCategoryError, setDeleteCategoryError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/categories`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch categories: ${response.statusText}`);
      }
      const data: Category[] = await response.json();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching categories');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCategoryName.trim()) {
      setAddCategoryError('Category name is required.');
      return;
    }
    setIsAddingCategory(true);
    setAddCategoryError(null);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null,
          color: newCategoryColor.trim() || null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add category: ${response.statusText}`);
      }
      const newCategoryData: Category = await response.json();
      setCategories(prev => [...prev, newCategoryData].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddDialog(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setNewCategoryColor('');
    } catch (err) {
      setAddCategoryError(err instanceof Error ? err.message : 'An unknown error occurred while adding the category');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleOpenEditDialog = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryDescription(category.description || '');
    setEditCategoryColor(category.color || '');
    setEditCategoryError(null);
    setShowEditDialog(true);
  };

  const handleUpdateCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCategory) return;
    if (!editCategoryName.trim()) {
      setEditCategoryError('Category name is required.');
      return;
    }
    setIsUpdatingCategory(true);
    setEditCategoryError(null);
    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editCategoryName.trim(),
          description: editCategoryDescription.trim() || null,
          color: editCategoryColor.trim() || null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update category: ${response.statusText}`);
      }
      const updatedCategoryData: Category = await response.json();
      setCategories(prev => 
        prev.map(cat => (cat.id === updatedCategoryData.id ? updatedCategoryData : cat))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setShowEditDialog(false);
      setEditingCategory(null);
    } catch (err) {
      setEditCategoryError(err instanceof Error ? err.message : 'An unknown error occurred while updating the category');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleOpenDeleteConfirmDialog = (category: Category) => {
    setDeletingCategory(category);
    setDeleteCategoryError(null);
    setShowDeleteConfirmDialog(true);
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    setIsDeletingCategory(true);
    setDeleteCategoryError(null);
    try {
      const response = await fetch(`/api/categories/${deletingCategory.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete category: ${response.statusText}`);
      }
      setCategories(prev => prev.filter(cat => cat.id !== deletingCategory.id));
      setShowDeleteConfirmDialog(false);
      setDeletingCategory(null);
    } catch (err) {
      setDeleteCategoryError(err instanceof Error ? err.message : 'An unknown error occurred while deleting the category');
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const defaultCategories = categories.filter(cat => cat.is_default);
  const customCategories = categories.filter(cat => !cat.is_default && cat.organization_id === organizationId);

  // TODO: Implement update, delete handlers
  // const handleUpdateCategory = async (categoryId: number, data: Partial<Category>) => { /* ... */ };
  // const handleDeleteCategory = async (categoryId: number) => { /* ... */ };

  if (isLoading && categories.length === 0) { // Show loading only on initial load
    return <p>Loading categories...</p>;
  }

  if (error && categories.length === 0) { // Show error only if loading failed and no categories are displayed
    return <p className="text-red-500">Error loading categories: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default Categories</CardTitle>
          <CardDescription>These categories are available to all organizations and cannot be deleted.</CardDescription>
        </CardHeader>
        <CardContent>
          {(isLoading && defaultCategories.length === 0) && <p className="text-sm text-muted-foreground">Loading default categories...</p>}
          {(!isLoading && defaultCategories.length === 0) && <p>No default categories found.</p>}
          <ul className="space-y-2">
            {defaultCategories.map(cat => (
              <li key={cat.id} className="flex justify-between items-center p-2 border rounded-md">
                <div>
                  <span className="font-semibold" style={{ color: cat.color || 'inherit' }}>{cat.name}</span>
                  <p className="text-sm text-muted-foreground">{cat.description || 'No description'}</p>
                </div>
                {/* TODO: Edit button for description/color of default categories? */}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Custom Categories for {organizationName}</CardTitle>
            <CardDescription>
              Manage your organization-specific categories. Remember: Creating categories with names similar to default 
              or existing custom categories may confuse AI categorization. Aim for distinct category names.
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setAddCategoryError(null); setNewCategoryName(''); setNewCategoryDescription(''); setNewCategoryColor(''); setShowAddDialog(true); }}>
                <IconPlus className="mr-2 h-4 w-4" /> Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Custom Category</DialogTitle>
                <DialogDescription>
                  Create a new category specific to {organizationName}.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCategory} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-cat-name" className="text-right">Name</Label>
                  <Input id="add-cat-name" value={newCategoryName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryName(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-cat-description" className="text-right">Description</Label>
                  <Textarea id="add-cat-description" value={newCategoryDescription} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewCategoryDescription(e.target.value)} className="col-span-3" placeholder="Optional: Briefly describe this category" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-cat-color" className="text-right">Color</Label>
                  <Input id="add-cat-color" value={newCategoryColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryColor(e.target.value)} className="col-span-3" placeholder="Optional: e.g., #FF0000 or green" />
                </div>
                {addCategoryError && (
                  <p className="col-span-4 text-red-500 text-sm text-center">{addCategoryError}</p>
                )}
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isAddingCategory}>{isAddingCategory ? 'Adding...' : 'Add Category'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {(isLoading && customCategories.length === 0) && <p className="text-sm text-muted-foreground">Loading custom categories...</p>}
          {(!isLoading && customCategories.length === 0 && !error) && <p>No custom categories defined for this organization yet.</p>}
          {error && customCategories.length === 0 && <p className="text-red-500">Could not load custom categories: {error.startsWith('Failed to fetch categories') ? 'Network error' : error}</p>}
          <ul className="space-y-2 mt-4">
            {customCategories.map(cat => (
              <li key={cat.id} className="flex justify-between items-center p-2 border rounded-md">
                <div>
                  <span className="font-semibold" style={{ color: cat.color || 'inherit' }}>{cat.name}</span>
                  <p className="text-sm text-muted-foreground">{cat.description || 'No description'}</p>
                </div>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(cat)}>
                    <IconEdit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleOpenDeleteConfirmDialog(cat)}>
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Edit Category Dialog - New Dialog Component */}
      {editingCategory && (
        <Dialog open={showEditDialog} onOpenChange={(isOpen) => { if (!isOpen) setEditingCategory(null); setShowEditDialog(isOpen); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Category: {editingCategory.name}</DialogTitle>
              <DialogDescription>Update the details for this custom category.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateCategory} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-cat-name" className="text-right">Name</Label>
                <Input id="edit-cat-name" value={editCategoryName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCategoryName(e.target.value)} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-cat-description" className="text-right">Description</Label>
                <Textarea id="edit-cat-description" value={editCategoryDescription} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditCategoryDescription(e.target.value)} className="col-span-3" placeholder="Optional: Briefly describe this category" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-cat-color" className="text-right">Color</Label>
                <Input id="edit-cat-color" value={editCategoryColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCategoryColor(e.target.value)} className="col-span-3" placeholder="Optional: e.g., #FF0000 or green" />
              </div>
              {editCategoryError && <p className="col-span-4 text-red-500 text-sm text-center">{editCategoryError}</p>}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={isUpdatingCategory}>{isUpdatingCategory ? 'Updating...' : 'Save Changes'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Category Confirmation Dialog - New Dialog Component */}
      {deletingCategory && (
        <Dialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => { if (!isOpen) setDeletingCategory(null); setShowDeleteConfirmDialog(isOpen); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Category: {deletingCategory.name}</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this custom category? This action cannot be undone. 
                Pull requests currently assigned this category will become uncategorized.
              </DialogDescription>
            </DialogHeader>
            {deleteCategoryError && (
              <p className="text-red-500 text-sm py-2 text-center">Error: {deleteCategoryError}</p>
            )}
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => { setDeletingCategory(null); setShowDeleteConfirmDialog(false); }}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={handleDeleteCategory} disabled={isDeletingCategory}>
                {isDeletingCategory ? 'Deleting...' : 'Delete Category'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 