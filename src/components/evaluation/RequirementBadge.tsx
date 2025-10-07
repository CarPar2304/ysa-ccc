import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface RequirementBadgeProps {
  label: string;
  cumple: boolean;
}

export const RequirementBadge = ({ label, cumple }: RequirementBadgeProps) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <span className="text-sm font-medium">{label}</span>
      {cumple ? (
        <Badge className="bg-green-500 hover:bg-green-600">
          <Check className="h-3 w-3 mr-1" />
          Cumple
        </Badge>
      ) : (
        <Badge variant="destructive">
          <X className="h-3 w-3 mr-1" />
          No Cumple
        </Badge>
      )}
    </div>
  );
};
