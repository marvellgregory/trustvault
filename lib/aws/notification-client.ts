export type TrustVaultNotification = {
  id: string;
  type: string;
  resource: string;
  resourceId: string;
  title: string;
  body: string;
  actionPath: string;
  status: "UNREAD";
  createdAt: string;
};

export type NotificationCollectionResult =
  | {
      ok: true;
      notifications: TrustVaultNotification[];
    }
  | {
      ok: false;
      status: number | null;
      code: string;
      message: string;
    };

const API_BASE_URL =
  process.env.NEXT_PUBLIC_TRUSTVAULT_API_BASE_URL?.replace(
    /\/+$/,
    "",
  );

function notificationPath() {
  if (!API_BASE_URL) {
    return null;
  }

  return `${API_BASE_URL}/notifications`;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readString(
  value: unknown,
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function readNotification(
  value: unknown,
): TrustVaultNotification | null {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    readString(value.id);
  const type =
    readString(value.type);
  const resource =
    readString(value.resource);
  const resourceId =
    readString(value.resourceId);
  const title =
    readString(value.title);
  const body =
    readString(value.body);
  const actionPath =
    readString(value.actionPath);
  const status =
    readString(value.status);
  const createdAt =
    readString(value.createdAt);

  if (
    !id ||
    !type ||
    !resource ||
    !resourceId ||
    !title ||
    body === null ||
    !actionPath ||
    status !== "UNREAD" ||
    !createdAt ||
    !Number.isFinite(
      Date.parse(createdAt),
    )
  ) {
    return null;
  }

  return {
    id,
    type,
    resource,
    resourceId,
    title,
    body,
    actionPath,
    status,
    createdAt,
  };
}

async function readJson(
  response: Response,
): Promise<unknown> {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function readApiError(
  body: unknown,
  status: number,
): NotificationCollectionResult {
  if (isRecord(body)) {
    const error =
      body.error;

    if (isRecord(error)) {
      const code =
        readString(error.code);
      const message =
        readString(error.message);

      if (code && message) {
        return {
          ok: false,
          status,
          code,
          message,
        };
      }
    }
  }

  return {
    ok: false,
    status,
    code: "NOTIFICATION_REQUEST_FAILED",
    message:
      "TrustVault could not load notifications.",
  };
}

function configurationError(): NotificationCollectionResult {
  return {
    ok: false,
    status: null,
    code: "NOTIFICATION_API_NOT_CONFIGURED",
    message:
      "TrustVault notifications are not configured.",
  };
}

function networkError(): NotificationCollectionResult {
  return {
    ok: false,
    status: null,
    code: "NOTIFICATION_NETWORK_ERROR",
    message:
      "TrustVault could not reach the notification service.",
  };
}

function readNotificationCollection(
  body: unknown,
): TrustVaultNotification[] | null {
  if (!isRecord(body)) {
    return null;
  }

  if (!Array.isArray(body.notifications)) {
    return null;
  }

  const notifications =
    body.notifications.map(
      readNotification,
    );

  if (
    notifications.some(
      (notification) =>
        notification === null,
    )
  ) {
    return null;
  }

  return notifications as TrustVaultNotification[];
}

export async function fetchNotifications(): Promise<NotificationCollectionResult> {
  const path =
    notificationPath();

  if (!path) {
    return configurationError();
  }

  try {
    const response =
      await fetch(path, {
        method: "GET",
        credentials: "include",
        headers: {
          accept: "application/json",
        },
      });

    const body =
      await readJson(response);

    if (!response.ok) {
      return readApiError(
        body,
        response.status,
      );
    }

    const notifications =
      readNotificationCollection(body);

    if (!notifications) {
      return {
        ok: false,
        status: response.status,
        code: "INVALID_NOTIFICATION_RESPONSE",
        message:
          "TrustVault received an invalid notification response.",
      };
    }

    return {
      ok: true,
      notifications,
    };
  } catch {
    return networkError();
  }
}
