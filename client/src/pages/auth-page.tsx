import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { insertUserSchema } from "@db/schema";
import { Fingerprint } from "lucide-react";
import type { InsertUser } from "@db/schema";

type AuthFormData = Pick<InsertUser, "username" | "email" | "bio">;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const { login, register } = useUser();

  const form = useForm<AuthFormData>({
    resolver: zodResolver(
      isLogin 
        ? insertUserSchema.pick({ email: true })
        : insertUserSchema.pick({ username: true, email: true, bio: true })
    ),
    defaultValues: {
      username: "",
      email: "",
      bio: "",
    },
  });

  const onSubmit = async (data: AuthFormData) => {
    try {
      if (isLogin) {
        await login(data.email);
        toast({
          title: "Welcome back!",
          description: "Successfully logged in",
        });
      } else {
        const { username, email, bio } = data;
        await register({ username, email, bio });
        toast({
          title: "Welcome to 36 Frames!",
          description: "Your account has been created",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-center mb-6">
          <Fingerprint className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold ml-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isLogin && (
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Choose a username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isLogin && (
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={form.formState.isSubmitting}
            >
              <Fingerprint className="h-4 w-4" />
              {form.formState.isSubmitting
                ? "Loading..."
                : isLogin
                ? "Continue with Passkey"
                : "Create Account with Passkey"}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Log in"}
          </Button>
        </div>
      </Card>
    </div>
  );
}