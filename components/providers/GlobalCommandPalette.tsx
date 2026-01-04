"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserPosts } from "@/lib/firestore";
import { Post } from "@/types";
import CommandPalette from "@/components/ui/CommandPalette";

export default function GlobalCommandPalette() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);

  // Fetch user posts for command palette search
  useEffect(() => {
    const fetchPosts = async () => {
      if (user) {
        try {
          const userPosts = await getUserPosts(user.uid, 10);
          setPosts(userPosts);
        } catch (error) {
          console.error("Error fetching posts for command palette:", error);
        }
      } else {
        setPosts([]);
      }
    };

    fetchPosts();
  }, [user]);

  return <CommandPalette posts={posts} />;
}
