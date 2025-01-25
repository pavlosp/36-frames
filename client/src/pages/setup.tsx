import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const setupSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(12, "Username cannot exceed 12 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
});

type SetupForm = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const form = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      username: "",
      bio: "",
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: SetupForm) => {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          userId: (queryClient.getQueryData(["/api/users/profile"]) as any)?.id,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/users/profile"], data);
      setLocation(`/profile/${data.username}`);
    },
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold">Welcome to 36 Frames!</h1>
          <p className="text-sm text-gray-500">Let's set up your profile</p>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => setupMutation.mutate(data))}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Choose a unique username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us about yourself"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={setupMutation.isPending}
              >
                {setupMutation.isPending ? "Setting up..." : "Complete Setup"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
