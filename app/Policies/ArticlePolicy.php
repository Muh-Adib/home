<?php

namespace App\Policies;

use App\Models\Article;
use App\Models\User;

class ArticlePolicy
{
    /**
     * Determine if user can view any articles
     * All authenticated users except guests can manage articles
     */
    public function viewAny(User $user): bool
    {
        return $user->role !== 'guest';
    }

    /**
     * Determine if user can view specific article
     * Published articles are public, drafts only for author/admin
     */
    public function view(?User $user, Article $article): bool
    {
        // Published articles are public
        if ($article->status === 'published') {
            return true;
        }
        
        // Drafts/scheduled only for authenticated non-guests
        if (!$user || $user->role === 'guest') {
            return false;
        }
        
        // Author or admin/manager can view
        return $user->id === $article->author_id 
            || in_array($user->role, ['super_admin', 'property_manager']);
    }

    /**
     * Determine if user can create articles
     * All authenticated users except guests
     */
    public function create(User $user): bool
    {
        return $user->role !== 'guest';
    }

    /**
     * Determine if user can update article
     * Author or admin/manager
     */
    public function update(User $user, Article $article): bool
    {
        return $user->id === $article->author_id 
            || in_array($user->role, ['super_admin', 'property_manager']);
    }

    /**
     * Determine if user can delete article
     * Author or admin
     */
    public function delete(User $user, Article $article): bool
    {
        return $user->id === $article->author_id 
            || $user->role === 'super_admin';
    }

    /**
     * Determine if user can publish article
     * Author or admin/manager
     */
    public function publish(User $user, Article $article): bool
    {
        return $user->id === $article->author_id 
            || in_array($user->role, ['super_admin', 'property_manager']);
    }

    /**
     * Determine if user can schedule article
     * Author or admin/manager
     */
    public function schedule(User $user, Article $article): bool
    {
        return $user->id === $article->author_id 
            || in_array($user->role, ['super_admin', 'property_manager']);
    }

    /**
     * Determine if user can restore soft-deleted article
     */
    public function restore(User $user, Article $article): bool
    {
        return $user->role === 'super_admin';
    }

    /**
     * Determine if user can permanently delete article
     */
    public function forceDelete(User $user, Article $article): bool
    {
        return $user->role === 'super_admin';
    }
}
