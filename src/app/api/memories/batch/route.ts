import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withWriteAuth, logAudit } from "@/lib/auth";
import { getClientIP } from "@/lib/utils";

const MAX_BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  return withWriteAuth(async (req, auth) => {
    try {
      const body = await request.json();
      const { operation, ids, data } = body;

      if (!operation || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: "operation and ids are required" },
          { status: 400 }
        );
      }

      if (ids.length > MAX_BATCH_SIZE) {
        return NextResponse.json(
          { error: `Maximum batch size is ${MAX_BATCH_SIZE}` },
          { status: 400 }
        );
      }

      let results: unknown[] = [];

      switch (operation) {
        case "delete": {
          const deleteCount = await prisma.memory.deleteMany({
            where: {
              id: { in: ids },
              namespace: auth.namespace,
            },
          });

          await logAudit(
            "delete",
            "memory",
            undefined,
            auth.namespace,
            undefined,
            auth.tokenId,
            getClientIP(request),
            { operation: "batch_delete", count: deleteCount.count }
          );

          results = [{ deleted: deleteCount.count }];
          break;
        }

        case "archive": {
          const updateData: Record<string, unknown> = { status: "archived" };
          if (data?.status) updateData.status = data.status;

          const updated = await prisma.memory.updateMany({
            where: {
              id: { in: ids },
              namespace: auth.namespace,
            },
            data: updateData,
          });

          await logAudit(
            "update",
            "memory",
            undefined,
            auth.namespace,
            undefined,
            auth.tokenId,
            getClientIP(request),
            { operation: "batch_archive", count: updated.count }
          );

          results = [{ updated: updated.count }];
          break;
        }

        case "update": {
          if (!data || typeof data !== "object") {
            return NextResponse.json(
              { error: "data is required for update operation" },
              { status: 400 }
            );
          }

          const updateData: Record<string, unknown> = {};
          if (data.title) updateData.title = data.title;
          if (data.content) updateData.content = data.content;
          if (data.tags) updateData.tags = data.tags;
          if (data.status) updateData.status = data.status;

          if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
              { error: "No valid fields to update" },
              { status: 400 }
            );
          }

          const updates: unknown[] = [];
          const failed: string[] = [];
          
          for (const id of ids) {
            try {
              const updated = await prisma.memory.update({
                where: { id, namespace: auth.namespace },
                data: updateData,
              });
              updates.push(updated);
            } catch (error) {
              if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
                failed.push(id);
              } else {
                throw error;
              }
            }
          }

          await logAudit(
            "update",
            "memory",
            undefined,
            auth.namespace,
            undefined,
            auth.tokenId,
            getClientIP(request),
            { operation: "batch_update", success: updates.length, failed: failed.length }
          );

          results = [{ success: updates, failed }];
          break;
        }

        case "addTags": {
          const memories = await prisma.memory.findMany({
            where: {
              id: { in: ids },
              namespace: auth.namespace,
            },
          });

          const newTags = Array.isArray(data?.tags) ? data.tags : [];
          
          const updates = await Promise.all(
            memories.map(memory => {
              const existingTags = memory.tags || [];
              const combinedTags = [...new Set([...existingTags, ...newTags])];
              return prisma.memory.update({
                where: { id: memory.id },
                data: { tags: combinedTags },
              });
            })
          );

          await logAudit(
            "update",
            "memory",
            undefined,
            auth.namespace,
            undefined,
            auth.tokenId,
            getClientIP(request),
            { operation: "batch_add_tags", count: updates.length, tags: newTags }
          );

          results = [{ updated: updates.length, tagsAdded: newTags }];
          break;
        }

        default:
          return NextResponse.json(
            { error: `Unknown operation: ${operation}. Supported: delete, archive, update, addTags` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        operation,
        processed: ids.length,
        results,
      });
    } catch (error) {
      console.error("Error processing batch operation:", error);
      return NextResponse.json(
        { error: "Batch operation failed" },
        { status: 500 }
      );
    }
  })(request);
}
