import { useState } from "react";
import { User, updateProfile, updatePassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ProfileTabProps {
  user: User | null;
}

const ProfileTab = ({ user }: ProfileTabProps) => {
  const [isUpdateProfileOpen, setIsUpdateProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdating(true);
    try {
      await updateProfile(user, { displayName });
      toast.success("প্রোফাইল আপডেট হয়েছে!");
      setIsUpdateProfileOpen(false);
    } catch (error: any) {
      toast.error(error.message || "প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
      return;
    }
    setIsUpdating(true);
    try {
      await updatePassword(user, newPassword);
      toast.success("পাসওয়ার্ড পরিবর্তন সফল হয়েছে!");
      setIsChangePasswordOpen(false);
      setNewPassword("");
    } catch (error: any) {
      toast.error("পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। পুনরায় লগইন করে আবার চেষ্টা করুন।");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="pb-8 animate-fade-in-up space-y-4 max-w-2xl mx-auto mt-4">
      <div className="premium-card p-6 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-4xl font-bold mb-4">
          {user?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <h2 className="text-2xl font-bold mb-1">{user?.displayName || "ব্যবহারকারী"}</h2>
        <p className="text-muted-foreground mb-6">{user?.email}</p>
        <div className="w-full space-y-3">
          <Button 
            className="w-full btn-primary h-12 rounded-xl text-md font-semibold"
            onClick={() => {
              setDisplayName(user?.displayName || "");
              setIsUpdateProfileOpen(true);
            }}
          >
            প্রোফাইল আপডেট করুন
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl text-md font-semibold"
            onClick={() => {
              setNewPassword("");
              setIsChangePasswordOpen(true);
            }}
          >
            পাসওয়ার্ড পরিবর্তন
          </Button>
        </div>
      </div>

      {/* Update Profile Dialog */}
      <Dialog open={isUpdateProfileOpen} onOpenChange={setIsUpdateProfileOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>প্রোফাইল আপডেট</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">আপনার নাম</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="আপনার নাম লিখুন"
                required
                className="h-11 rounded-xl"
              />
            </div>
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsUpdateProfileOpen(false)}
                className="rounded-xl h-11"
              >
                বাতিল
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl h-11 btn-primary"
                disabled={isUpdating || !displayName.trim()}
              >
                {isUpdating ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>পাসওয়ার্ড পরিবর্তন</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">নতুন পাসওয়ার্ড</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="নতুন পাসওয়ার্ড লিখুন"
                required
                className="h-11 rounded-xl"
                minLength={6}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsChangePasswordOpen(false)}
                className="rounded-xl h-11"
              >
                বাতিল
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl h-11 btn-primary"
                disabled={isUpdating || newPassword.length < 6}
              >
                {isUpdating ? "পরিবর্তন হচ্ছে..." : "পরিবর্তন করুন"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileTab;
