import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReplySchema, type CreateReplyInput } from "@helpdesk/core/schemas/tickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { axiosErrorMessage } from "@/lib/axios-error";

type ReplyFormProps = {
  ticketId: string;
};

export default function ReplyForm({ ticketId }: ReplyFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { body: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateReplyInput) => axios.post(`/api/tickets/${ticketId}/replies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId, "replies"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      reset();
    },
  });

  const serverError = axiosErrorMessage(mutation.error);

  return (
    <form
      noValidate
      className="mt-4 space-y-2"
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
    >
      <Label htmlFor="reply-body">Reply</Label>
      <Textarea
        id="reply-body"
        aria-invalid={!!errors.body}
        disabled={mutation.isPending}
        {...register("body")}
      />
      <FieldError message={errors.body?.message} />
      <FieldError message={serverError} />

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Sending…" : "Send reply"}
      </Button>
    </form>
  );
}
