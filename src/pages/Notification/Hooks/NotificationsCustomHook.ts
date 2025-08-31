import { deleteNotification, markAllNotificationsAsRead, markNotificationAsRead } from '@services/notifications';
import { useMutation } from '@tanstack/react-query';

export const useNotificationMutations = (actionRef?: React.MutableRefObject<any>) => {
    const deleteNotificationMutation = useMutation({
        mutationFn: async (id: string) => await deleteNotification(id),
        onSuccess: () => {
            actionRef?.current?.reload();
        },
    });

    const markAsReadMutation = useMutation({
        mutationFn: async (id: string) => await markNotificationAsRead(id),
        onSuccess: () => {
            actionRef?.current?.reload();
        },
    });

    // not done yet
    // This mutation is for marking notifications as unread, which is not implemented in the service yet
    const markAsUnreadMutation = useMutation({
        mutationFn: async (id: string) => await markNotificationAsRead(id),
        onSuccess: () => {
            actionRef?.current?.reload();
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => await markAllNotificationsAsRead(),
        onSuccess: () => {
            actionRef?.current?.reload();
        },
    });

    return { deleteNotificationMutation, markAsReadMutation, markAsUnreadMutation, markAllAsReadMutation };
};
